#!/usr/bin/env python3
"""Build the original B2→C1 English course and wire it into the homepage.

Sources live in content/english-c1/. Run from the repository root:

    PYTHONUTF8=1 python scripts/build-english-course.py
"""
import csv
import html
import importlib.util
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/english-c1'
OUT = ROOT / 'zh/english-c1'
ERROR_TYPES = ('用法判断', '形式选择', '句子改写', '中式英语')
LEVEL_ORDER = ('F0', 'B2', 'C1')
QUESTION_TYPES = ('mc', 'text', 'transform', 'reveal')


def fail(message):
    raise SystemExit('English course build failed: ' + message)


def load_module(name):
    sys.path.insert(0, str(SOURCE))
    path = SOURCE / f'{name}.py'
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def check_text(value, where):
    if not isinstance(value, str) or not value.strip():
        fail(f'{where}: text is missing')


def check_examples(items, where):
    if not items:
        fail(f'{where}: examples must not be empty')
    for item in items:
        if not (isinstance(item, dict) and item.get('en', '').strip() and item.get('zh', '').strip()):
            fail(f'{where}: each example needs en and zh text')


def check_table(table, where):
    headers, rows = table.get('headers'), table.get('rows')
    if not (isinstance(headers, list) and len(headers) >= 2 and isinstance(rows, list) and rows):
        fail(f'{where}: table needs headers and rows')
    for row in rows:
        if not (isinstance(row, list) and len(row) == len(headers) and all(isinstance(cell, str) and cell.strip() for cell in row)):
            fail(f'{where}: every table row must have {len(headers)} text cells')


def validate(course):
    if [level['id'] for level in course['levels']] != list(LEVEL_ORDER):
        fail('levels must be ' + ', '.join(LEVEL_ORDER))
    if course.get('storageKey') != 'english-c1-course-v1':
        fail('storageKey must stay english-c1-course-v1 so existing local progress keeps its name')
    plan = course['plan']
    for key in ('title', 'summary', 'horizon', 'dailyIntro', 'weeklyIntro'):
        check_text(plan.get(key), f'plan {key}')
    if not (plan['audience'] and plan['phases'] and plan['milestones'] and plan['how']):
        fail('plan is missing audience, phases, milestones, or how-to-study')
    for table_key in ('phaseTable', 'examTable'):
        check_table(plan[table_key], table_key)
    if not plan['daily'] or not plan['weekly']:
        fail('plan needs a daily routine and a weekly session')
    milestone_ids = [item['id'] for item in plan['milestones']]
    if len(milestone_ids) != len(set(milestone_ids)):
        fail('milestone ids must be unique')
    seen_modules, seen_lessons, seen_questions = set(), set(), set()
    type_counts = {kind: 0 for kind in QUESTION_TYPES}
    for number, module in enumerate(course['modules'], 1):
        if module['id'] != f'm{number}' or module['id'] in seen_modules:
            fail(f"module id {module['id']} is out of sequence")
        seen_modules.add(module['id'])
        if module['level'] not in LEVEL_ORDER:
            fail(f"{module['id']}: unknown level")
        check_text(module['title'], module['id'])
        check_text(module['description'], module['id'])
        if len(module['lessons']) != 2:
            fail(f"{module['id']}: needs two lessons")
        for lesson_number, lesson in enumerate(module['lessons'], 1):
            lid = lesson['id']
            if lid != f"{module['id']}-l{lesson_number}" or lid in seen_lessons:
                fail(f'lesson id {lid} is out of sequence')
            seen_lessons.add(lid)
            for key in ('title', 'goal', 'exam'):
                check_text(lesson.get(key), f'{lid} {key}')
            if not isinstance(lesson.get('minutes'), int):
                fail(f'{lid}: minutes must be an integer')
            notice = lesson['notice']
            check_text(notice.get('prompt'), f'{lid} notice')
            check_text(notice.get('answer'), f'{lid} notice answer')
            check_examples(notice.get('examples'), f'{lid} notice')
            if not 3 <= len(lesson['rules']) <= 5:
                fail(f'{lid}: needs 3–5 rules')
            if not any('table' in rule for rule in lesson['rules']):
                fail(f'{lid}: needs at least one form table')
            if not any(rule.get('mistakes') for rule in lesson['rules']):
                fail(f'{lid}: needs common-mistake pairs')
            example_count = len(notice['examples'])
            for rule in lesson['rules']:
                check_text(rule.get('title'), f'{lid} rule')
                check_text(rule.get('body'), f'{lid} rule body')
                check_examples(rule.get('examples'), f"{lid} {rule['title']}")
                example_count += len(rule['examples'])
                if 'table' in rule:
                    check_table(rule['table'], f"{lid} {rule['title']}")
                for mistake in rule.get('mistakes', []):
                    for key in ('wrong', 'right', 'why'):
                        check_text(mistake.get(key), f"{lid} mistake {key}")
            if example_count < 8:
                fail(f'{lid}: needs more English examples')
            if len(lesson['questions']) != 6:
                fail(f'{lid}: needs exactly 6 questions')
            kinds = set()
            for question in lesson['questions']:
                if question['id'] in seen_questions:
                    fail(f"duplicate question {question['id']}")
                seen_questions.add(question['id'])
                if question['type'] not in QUESTION_TYPES:
                    fail(f"{question['id']}: unknown type")
                kinds.add(question['type'])
                type_counts[question['type']] += 1
                for key in ('prompt', 'answer', 'hint', 'explanation'):
                    check_text(question.get(key), f"{question['id']} {key}")
                if question['errorType'] not in ERROR_TYPES:
                    fail(f"{question['id']}: errorType is not recognised")
                if question['type'] == 'mc':
                    options = question.get('options') or []
                    if len(options) < 3 or len(set(options)) != len(options) or question['answer'] not in options:
                        fail(f"{question['id']}: options must be distinct and include the answer")
                if question['type'] == 'transform':
                    check_text(question.get('source'), question['id'])
                    check_text(question.get('keyword'), question['id'])
                if question['type'] == 'reveal':
                    check_text(question.get('stem'), question['id'])
                for accepted in question.get('accepted', []):
                    check_text(accepted, f"{question['id']} accepted")
            if kinds != set(QUESTION_TYPES):
                fail(f'{lid}: each lesson needs a multiple choice, a fill-in, a transformation, and a reveal item')
            task = lesson['task']
            check_text(task.get('prompt'), f'{lid} task')
            check_text(task.get('model'), f'{lid} task model')
            if len(task.get('rubric', [])) != 3:
                fail(f'{lid}: task needs three self-check lines')
    if min(type_counts.values()) < 1:
        fail('course is missing an exercise type')


def course_data():
    plan = load_module('data_plan').PLAN
    modules = []
    for name in ('data_f0', 'data_b2a', 'data_b2b', 'data_c1a', 'data_c1b'):
        modules.extend(load_module(name).MODULES)
    course = {
        'schemaVersion': '1.0',
        'storageKey': 'english-c1-course-v1',
        'title': '英语语法 · B2→C1 进阶课程',
        'subtitle': '补牢基础，再用大约一年到一年半把语法用到 C1 的精度',
        'scope': '面向已经通过 B2、觉得基础还不稳、准备 Cambridge C1 Advanced 的中文母语者。讲解用简体中文，例句和练习用英语。内容是本站原创，不是考试真题，也不代表等级认证。',
        'levels': [
            {'id': 'F0', 'name': '模块 0 · 基础回顾', 'description': '时态与体、冠词、可数性、介词、一致和中文母语者最常同时犯的错。'},
            {'id': 'B2', 'name': '语法精度', 'description': '从完成进行体、情态和条件，到从句、强调、愿望和非谓语。'},
            {'id': 'C1', 'name': '篇章与用词', 'description': '连接、名词化、省略、搭配、短语动词、构词和关键词转换。'},
        ],
        'plan': plan,
        'modules': modules,
    }
    validate(course)
    return course


def write_csv(course):
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(['题目ID', '级别', '模块', '课时', '题型', '题干', '关键词或原句', '选项JSON', '正确答案', '亦可接受JSON', '提示', '解析', '错误维度'])
    for module in course['modules']:
        for lesson in module['lessons']:
            for question in lesson['questions']:
                stem = question.get('keyword') or question.get('source') or question.get('stem') or ''
                writer.writerow([
                    question['id'], module['level'], module['title'], lesson['title'], question['type'],
                    question['prompt'], stem, json.dumps(question.get('options', []), ensure_ascii=False),
                    question['answer'], json.dumps(question.get('accepted', []), ensure_ascii=False),
                    question['hint'], question['explanation'], question['errorType'],
                ])
    return '﻿' + stream.getvalue()


def update_homepage(course):
    lessons = [lesson for module in course['modules'] for lesson in module['lessons']]
    questions = sum(len(lesson['questions']) for lesson in lessons)
    path = ROOT / 'index.html'
    text = path.read_text(encoding='utf-8')
    match = re.search(r'(<script id="catalog-data" type="application/json">)(.*?)(</script>)', text, re.S)
    if not match:
        fail('index.html is missing catalog-data')
    catalog = json.loads(match.group(2))
    module_number = {module['id']: number for number, module in enumerate(course['modules'], 1)}
    chapters = [{
        't': 0, 'code': 'plan', 'mods': 'plan', 'file': 'index.html#plan',
        'es': 'B2 to C1 roadmap', 'zh': '从 B2 到 C1 的学习计划',
        'obj': 'plan.', 'n': 0, 'scenes': 0, 'quizzes': 0, 'drills': 0,
    }]
    for module, lesson in ((module, lesson) for module in course['modules'] for lesson in module['lessons']):
        chapters.append({
            't': module_number[module['id']], 'code': lesson['id'], 'mods': lesson['id'],
            'file': f"index.html#lesson-{lesson['id']}", 'es': lesson['title'], 'zh': lesson['title'],
            'obj': lesson['id'] + '.', 'n': len(lesson['questions']), 'scenes': 0,
            'quizzes': len(lesson['questions']), 'drills': 1,
        })
    entry = {
        'code': 'EN B2–C1',
        'slug': 'english-c1',
        'zh': course['title'],
        'en': 'English Grammar · B2 to C1',
        'zh_title': course['title'],
        'en_title': 'English Grammar · B2 to C1',
        'es': 'English Grammar · B2 to C1',
        'subtitle': f'{len(course["modules"])} 个模块 · 模块 0 到 C1 · 中文讲解',
        'category': 'language',
        'summary': course['scope'],
        'en_summary': 'A Chinese-guided B2 to C1 English grammar course, with a 12–18 month plan, foundation review, and original interactive practice.',
        'tags': ['学习计划', '模块 0 基础', '语法精度', '篇章与用词'],
        'key': course['storageKey'],
        'has_en': False,
        'localOnly': True,
        'temas': [{'t': 0, 'es': '学习计划'}] + [
            {'t': module_number[module['id']], 'es': f"{module['level']} · {module['title']}"}
            for module in course['modules']
        ],
        'chapters': chapters,
        'capitulos': len(lessons),
        'total': questions,
        'scenes': 0,
        'quizzes': questions,
        'drills': len(lessons),
        'prefijos': [lesson['id'] + '.' for lesson in lessons],
    }
    published = catalog['published']
    existing = next((index for index, item in enumerate(published) if item.get('slug') == 'english-c1'), None)
    if existing is None:
        anchor = next(index for index, item in enumerate(published) if item.get('slug') == 'spanish-grammar')
        published.insert(anchor + 1, entry)
    else:
        published[existing] = entry
    text = text[:match.start(2)] + json.dumps(catalog, ensure_ascii=False) + text[match.end(2):]

    search = (
        '英语 语法 English grammar B2 C1 Advanced Cambridge 学习计划 模块0 基础回顾 冠词 时态 完成时 '
        '情态动词 must have 条件句 混合条件 被动 have something done 间接引语 关系从句 分词从句 '
        '倒装 分裂句 wish if only 动名词 不定式 名词化 省略 搭配 短语动词 构词 关键词转换 Use of English 中式英语'
    )
    summary = f'中文讲解的 B2→C1 语法课：一份 12–18 个月计划，模块 0 补基础，再用 {questions} 道选择、填空、改写和参考答案练习把形式练稳。'
    en_summary = f'Chinese-guided B2 to C1 grammar: a 12–18 month plan, a foundations review, and {questions} original multiple-choice, fill-in, transformation, and reveal exercises.'
    card = (
        f'<a class="course-card" href="zh/english-c1/" data-course="english-c1" data-category="language" '
        f'data-local-only="true" data-search="{html.escape(search, quote=True)}">'
        '<div class="card-top"><span class="course-code">EN B2–C1</span>'
        '<span class="course-domain" data-zh="语言学习" data-en="LANGUAGES">语言学习</span></div>'
        f'<h3 data-zh="{html.escape(course["title"], quote=True)}" data-en="English Grammar · B2 to C1">{html.escape(course["title"])}</h3>'
        f'<p data-zh="{html.escape(summary, quote=True)}" data-en="{html.escape(en_summary, quote=True)}">{html.escape(summary)}</p>'
        f'<div class="card-bottom"><span><span>{len(lessons)}</span> <span data-i18n="lessons">讲</span><span class="progress-label"></span></span>'
        '<span class="card-arrow" aria-hidden="true">↗</span></div></a>'
    )
    card_pattern = r'<a class="course-card" href="zh/english-c1/".*?</a>\n?'
    if re.search(card_pattern, text, re.S):
        text = re.sub(card_pattern, card + '\n', text, count=1, flags=re.S)
    else:
        spanish = r'(<a class="course-card" href="zh/spanish-grammar/".*?</a>)'
        if not re.search(spanish, text, re.S):
            fail('cannot find the Spanish course card to place English beside it')
        text = re.sub(spanish, lambda found: found.group(1) + '\n' + card, text, count=1, flags=re.S)
    article = (
        '<a class="article-row" href="zh/english-c1/#plan" data-search="从 B2 到 C1 的一年计划 B2 to C1 in a year 语言学习 LANGUAGES EN B2–C1 每天十分钟 剑桥 C1 Advanced">'
        '<span class="article-index">05</span><div class="article-copy">'
        '<span class="article-category" data-zh="语言学习" data-en="LANGUAGES">语言学习</span>'
        '<h3 data-zh="从 B2 走到 C1：一份 12–18 个月的计划" data-en="From B2 to C1: a 12–18 month plan">从 B2 走到 C1：一份 12–18 个月的计划</h3>'
        '<p data-zh="每天大约 10 分钟，每周一次长练习，以及它和 C1 Advanced 四项的对应。" data-en="Ten minutes on weekdays, one longer weekly session, and how the work maps onto C1 Advanced.">每天大约 10 分钟，每周一次长练习，以及它和 C1 Advanced 四项的对应。</p>'
        '</div><span class="article-source">EN · PLAN</span><span class="article-arrow" aria-hidden="true">↗</span></a>'
    )
    article_pattern = r'<a class="article-row" href="zh/english-c1/#plan".*?</a>'
    if re.search(article_pattern, text, re.S):
        text = re.sub(article_pattern, article, text, count=1, flags=re.S)
    else:
        anchor = '</div></section>\n<section id="labs"'
        if anchor not in text:
            fail('cannot find the article list that closes before the labs section')
        text = text.replace(anchor, article + anchor, 1)
    count = len(re.findall(r'<a class="course-card"', text))
    text = re.sub(r'(<span id="course-count">)\d+(</span>)', rf'\g<1>{count}\g<2>', text, count=1)
    text = re.sub(r'(查看全部 )\d+( 门课程)', rf'\g<1>{count}\g<2>', text, count=1)
    if text.count('href="zh/english-c1/"') != 1:
        fail('homepage should contain exactly one English course card')
    path.write_text(text, encoding='utf-8')


def build():
    course = course_data()
    template = (SOURCE / 'player.template.html').read_text(encoding='utf-8')
    if template.count('__COURSE_JSON__') != 1:
        fail('player template must contain __COURSE_JSON__ once')
    data = json.dumps(course, ensure_ascii=False, indent=2)
    page = template.replace('__COURSE_JSON__', data.replace('<', '\\u003c'))
    materials = OUT / 'materials'
    materials.mkdir(parents=True, exist_ok=True)
    (OUT / 'index.html').write_text(page, encoding='utf-8')
    (materials / 'course.json').write_text(data + '\n', encoding='utf-8')
    (materials / 'exercises.csv').write_text(write_csv(course), encoding='utf-8', newline='')
    update_homepage(course)
    lessons = sum(len(module['lessons']) for module in course['modules'])
    questions = sum(len(lesson['questions']) for module in course['modules'] for lesson in module['lessons'])
    print(f'Built English B2–C1 course: {len(course["modules"])} modules, {lessons} lessons, {questions} questions, plus the study plan.')


if __name__ == '__main__':
    sys.exit(build() or 0)
