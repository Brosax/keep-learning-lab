#!/usr/bin/env python3
"""Build the Spanish grammar course (A1–C1) from editable source files, offline.

Sources: content/spanish-grammar/course.json (course metadata and level list) and
content/spanish-grammar/levels/<level>.json (modules, lessons, questions, tasks).
Outputs: the course page, public JSON/CSV, teacher guide (.docx), offline package
(.zip) and the Spanish entry of the homepage catalog and card in index.html.

Run: PYTHONUTF8=1 python scripts/build-spanish-course.py
"""
import csv
import html
import io
import json
import re
import sys
import zipfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/spanish-grammar'
OUT = ROOT / 'zh/spanish-grammar'
SITE = 'https://seei-comunidad.vercel.app/zh/spanish-grammar/'
ERROR_TYPES = ('用法判断', '词形变化', '句子组织')
LEVEL_ORDER = ('A1', 'A2', 'B1', 'B2', 'C1')


def fail(message):
    raise SystemExit('Spanish course build failed: ' + message)


def check_examples(items, where):
    if not items:
        fail(f'{where}: examples must not be empty')
    for item in items:
        if not (isinstance(item, dict) and item.get('es', '').strip() and item.get('zh', '').strip()):
            fail(f'{where}: each example needs es and zh text')


def check_table(table, where):
    headers, rows = table.get('headers'), table.get('rows')
    if not (isinstance(headers, list) and len(headers) >= 2 and isinstance(rows, list) and rows):
        fail(f'{where}: table needs headers (2+) and rows')
    for row in rows:
        if not (isinstance(row, list) and len(row) == len(headers) and all(isinstance(cell, str) for cell in row)):
            fail(f'{where}: every table row must have {len(headers)} text cells')


def load_course(allow_missing=False):
    meta = json.loads((SOURCE / 'course.json').read_text(encoding='utf-8'))
    levels = meta['levels']
    if [level['id'] for level in levels] != list(LEVEL_ORDER):
        fail('course.json levels must be ' + ', '.join(LEVEL_ORDER))
    if allow_missing:
        # Drafting aid: build only the levels whose files exist. Never publish such a build.
        levels = [level for level in levels if (SOURCE / level['file']).is_file()]
    modules = []
    for level in levels:
        data = json.loads((SOURCE / level['file']).read_text(encoding='utf-8'))
        if data.get('level') != level['id'] or not data.get('modules'):
            fail(f"{level['file']}: level must be {level['id']} and contain modules")
        for module in data['modules']:
            if module.get('level') != level['id']:
                fail(f"{module.get('id')}: module level must be {level['id']}")
            modules.append(module)
    course = {key: value for key, value in meta.items() if key != 'levels'}
    course['levels'] = [{key: value for key, value in level.items() if key != 'file'} for level in levels]
    course['modules'] = modules
    validate(course, strict_sequence=not allow_missing)
    return course


def validate(course, strict_sequence=True):
    module_ids, lesson_ids, question_ids = set(), set(), set()
    for number, module in enumerate(course['modules'], 1):
        if (strict_sequence and module['id'] != f'm{number}') or not re.fullmatch(r'm\d+', module['id']) or module['id'] in module_ids:
            fail(f"module {module['id']} must be m{number}")
        module_ids.add(module['id'])
        if not (module['title'] and module['description'] and len(module['lessons']) == 2):
            fail(f"{module['id']}: needs title, description and two lessons")
        for lesson_number, lesson in enumerate(module['lessons'], 1):
            lid = lesson['id']
            if lid != f"{module['id']}-l{lesson_number}" or lid in lesson_ids:
                fail(f'lesson id {lid} out of sequence')
            lesson_ids.add(lid)
            if not (lesson['title'] and lesson['goal'] and isinstance(lesson.get('minutes'), int)):
                fail(f'{lid}: needs title, goal and integer minutes')
            notice = lesson['notice']
            if not (notice['prompt'] and notice['answer']):
                fail(f'{lid}: notice needs prompt and answer')
            check_examples(notice['examples'], f'{lid} notice')
            if not 3 <= len(lesson['rules']) <= 5:
                fail(f'{lid}: needs 3–5 rules')
            for rule in lesson['rules']:
                if not (rule['title'] and rule['body']):
                    fail(f'{lid}: rule needs title and body')
                check_examples(rule['examples'], f"{lid} rule {rule['title']}")
                if 'table' in rule:
                    check_table(rule['table'], f"{lid} rule {rule['title']}")
            if len(lesson['questions']) != 6:
                fail(f'{lid}: needs exactly 6 questions')
            for q_number, q in enumerate(lesson['questions'], 1):
                if q['id'] != f'{lid}-q{q_number}' or q['id'] in question_ids:
                    fail(f"question id {q['id']} out of sequence")
                question_ids.add(q['id'])
                if q['type'] not in ('mc', 'text') or not (q['prompt'] and q['answer'] and q['hint'] and q['explanation']):
                    fail(f"{q['id']}: incomplete question")
                if q['errorType'] not in ERROR_TYPES:
                    fail(f"{q['id']}: errorType must be one of {ERROR_TYPES}")
                if q['type'] == 'mc':
                    if len(q['options']) < 2 or len(set(q['options'])) != len(q['options']) or q['answer'] not in q['options']:
                        fail(f"{q['id']}: options must be distinct and contain the answer")
                elif not all(isinstance(item, str) and item.strip() for item in q.get('accepted', [])):
                    fail(f"{q['id']}: accepted answers must be non-empty text")
            task = lesson['task']
            if not (task['prompt'] and task['model'] and len(task['rubric']) == 3):
                fail(f'{lid}: task needs prompt, model and three rubric items')


def lessons_of(course):
    return [lesson for module in course['modules'] for lesson in module['lessons']]


def counts(course):
    lessons = lessons_of(course)
    return len(course['modules']), len(lessons), sum(len(lesson['questions']) for lesson in lessons)


def write_csv(course):
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(['题目ID', '级别', '模块', '课时', '题型', '题干', '选项JSON', '正确答案', '亦可接受JSON', '首次错答提示', '解析', '错误维度'])
    for module in course['modules']:
        for lesson in module['lessons']:
            for q in lesson['questions']:
                writer.writerow([q['id'], module['level'], module['title'], lesson['title'], q['type'], q['prompt'],
                                 json.dumps(q.get('options', []), ensure_ascii=False), q['answer'],
                                 json.dumps(q.get('accepted', []), ensure_ascii=False), q['hint'], q['explanation'], q['errorType']])
    return '﻿' + stream.getvalue()


def build_teacher_guide(course):
    import docx
    from docx.shared import Pt

    modules, lessons, questions = counts(course)
    doc = docx.Document()
    doc.styles['Normal'].font.size = Pt(10.5)
    doc.add_heading(course['title'], 0)
    doc.add_paragraph(course['subtitle'], style='Subtitle')
    doc.add_paragraph(f'版本 {course["schemaVersion"]} · 原创课程内容 · {date.today().isoformat()}')

    doc.add_heading('课程定位', 1)
    doc.add_paragraph(course['scope'])
    doc.add_paragraph(f'本课程包含 5 个级别、{modules} 个模块、{lessons} 节短课、{questions} 道自动检查练习和 {lessons} 项开放表达任务。'
                      '建议每周完成一个模块，并在次日和一周后各复习一次。课程时长不等于达到某一欧框等级所需的全部学习时长；'
                      '级别划分参考塞万提斯学院《课程计划》的语法清单，本课程只覆盖语法，不代替词汇、听说读写的综合训练，也不代表等级认证。')
    doc.add_paragraph('先修：A1 适合能借助注释读出简单西语词语的学习者。之后各级默认已掌握前一级的语法点，可按需从任一级开始。'
                      '例句以通用的半岛标准西语为基准，保留 vosotros 变位；拉美用法不同时在规则中说明。')

    doc.add_heading('每课的教学流程', 1)
    for step in ['观察例句（3–5分钟）：学生先指出相同与不同之处，再展开观察提示。',
                 '理解规则（5–10分钟）：讲解含义、句法作用与词形变化，配中西对照例句；新时态与新语式附完整变位表。',
                 '分层操练（8–10分钟）：3道选择题与3道填写题，先判断用法，再检查词形与句子组织。',
                 '表达任务（6–10分钟）：独立写作或与同伴交流；有同伴时先问答，再完成文字记录。',
                 '反馈与回顾（3分钟）：对照清单自评，教师给出一个优先修改点，再重做。']:
        doc.add_paragraph(step, style='List Bullet')

    doc.add_heading('如何反馈与评价', 1)
    doc.add_paragraph('客观练习：错答先给提示，允许再试；主动查看解析不等于独立掌握。课程分别记录首次答对和练习完成；'
                      '错题复习收录首答错误或看过解析的题。首次正确只能反映本次表现，应结合隔日新题和表达任务判断掌握程度。')
    doc.add_paragraph('开放表达任务：课程页仅保存草稿与自评，不自动给分。教师可按以下三项分别评 0–2 分；'
                      '允许符合任务要求的多种正确答案。参考答案是示例，不是唯一答案。')
    table = doc.add_table(rows=4, cols=4)
    table.style = 'Table Grid'
    for row, cells in zip(table.rows, [['维度', '0分', '1分', '2分'],
                                       ['用法判断', '结构与意图不符', '借助提示可选对', '能独立选用合适结构'],
                                       ['词形变化', '错误妨碍理解', '少量错误，提示后能改', '目标词形基本准确'],
                                       ['独立表达', '未完成任务', '依靠句型或示例完成', '能在新信息下完成任务']]):
        for cell, text in zip(row.cells, cells):
            cell.text = text

    doc.add_heading('级别与教学顺序', 1)
    week = 0
    for level in course['levels']:
        doc.add_heading(f"{level['id']} · {level['name']}", 2)
        doc.add_paragraph(level['description'])
        for module in course['modules']:
            if module['level'] != level['id']:
                continue
            week += 1
            doc.add_paragraph(f"第{week}周 · {module['title']}：" + '；'.join(lesson['title'] for lesson in module['lessons']))

    doc.add_heading('互动与平台适配', 1)
    doc.add_paragraph(f'在线入口：{SITE} 。源内容位于 content/spanish-grammar/（course.json 与 levels/ 下各级别文件），'
                      '使用 scripts/build-spanish-course.py 无网络生成课程页、题库、本教师用书和离线课程包。')
    doc.add_paragraph('基础功能：选择、填空、逐题反馈、错题复习、作业草稿、自评与学习记录导出；填空题提供重音字母输入按钮。'
                      '需平台另行支持的功能：教师收件与批改、同伴分组、云端同步、语音录制或自动语音评分。')
    doc.add_paragraph('学习记录保存在当前浏览器；课程页可导出详细记录，首页备份包含本课程的答题与草稿。文件版本与在线版本的记录不自动合并。'
                      '本课程暂未接入账号云端同步。文本题忽略大小写、首尾句子标点和多余空格，但保留重音符号；只错在重音时会给出专门提示。'
                      '选择题精确区分选项。')

    doc.add_heading('设计参考', 1)
    doc.add_paragraph('以下参考用于组织教学流程、诊断练习与语法点分级；课程例句、题目和反馈为本项目原创。')
    for title, url in course['sources']:
        doc.add_paragraph(f'{title}\n{url}')

    def example_line(example):
        return f"{example['es']} — {example['zh']}"

    for level in course['levels']:
        doc.add_heading(f"{level['id']} · {level['name']}", 1)
        doc.add_paragraph(level['description'])
        for module in course['modules']:
            if module['level'] != level['id']:
                continue
            doc.add_heading(module['title'], 1)
            doc.add_paragraph(module['description'])
            for lesson in module['lessons']:
                doc.add_heading(lesson['title'], 2)
                doc.add_paragraph(f"目标：{lesson['goal']}  |  建议时长：{lesson['minutes']} 分钟")
                doc.add_heading('观察与发现', 3)
                doc.add_paragraph(lesson['notice']['prompt'])
                for example in lesson['notice']['examples']:
                    doc.add_paragraph(f"{example['es']}\n{example['zh']}")
                doc.add_paragraph('观察提示：' + lesson['notice']['answer'])
                for rule in lesson['rules']:
                    doc.add_heading(rule['title'], 3)
                    doc.add_paragraph(rule['body'])
                    if 'table' in rule:
                        data = rule['table']
                        if data.get('caption'):
                            doc.add_paragraph(data['caption'])
                        grid = doc.add_table(rows=1 + len(data['rows']), cols=len(data['headers']))
                        grid.style = 'Table Grid'
                        for row, cells in zip(grid.rows, [data['headers'], *data['rows']]):
                            for cell, text in zip(row.cells, cells):
                                cell.text = text
                    for example in rule['examples']:
                        doc.add_paragraph(example_line(example))
                doc.add_heading('互动题目、答案与反馈', 3)
                for number, q in enumerate(lesson['questions'], 1):
                    doc.add_paragraph(f"{number}. [{q['errorType']}] {q['prompt']}")
                    if q['type'] == 'mc':
                        doc.add_paragraph('  /  '.join(q['options']))
                    doc.add_paragraph('首次错答提示：' + q['hint'])
                    answer = q['answer'] + (('（亦可：' + '、'.join(q['accepted']) + '）') if q.get('accepted') else '')
                    doc.add_paragraph('答案：' + answer)
                    doc.add_paragraph('解析：' + q['explanation'])
                doc.add_heading('表达任务', 3)
                doc.add_paragraph(lesson['task']['prompt'])
                for criterion in lesson['task']['rubric']:
                    doc.add_paragraph('□ ' + criterion)
                doc.add_paragraph('参考表达：\n' + lesson['task']['model'])
    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def update_homepage(course):
    modules, lessons, questions = counts(course)
    path = ROOT / 'index.html'
    text = path.read_text(encoding='utf-8')
    pattern = r'(<script id="catalog-data" type="application/json">)(.*?)(</script>)'
    match = re.search(pattern, text, re.S)
    if not match:
        fail('index.html is missing the catalog-data block')
    catalog = json.loads(match[2])
    entry = next((item for item in catalog['published'] if item['slug'] == 'spanish-grammar'), None)
    if entry is None:
        fail('catalog-data has no spanish-grammar entry')
    module_number = {module['id']: number for number, module in enumerate(course['modules'], 1)}
    all_lessons = [(module, lesson) for module in course['modules'] for lesson in module['lessons']]
    entry.update({
        'code': 'ES A1–C1',
        'zh': course['title'], 'zh_title': course['title'],
        'en': 'Spanish Grammar · A1–C1 Interactive Course', 'en_title': 'Spanish Grammar · A1–C1 Interactive Course',
        'es': 'Gramática española · Curso interactivo A1–C1',
        'subtitle': f'{modules} 个模块 · A1–C1 · 中文讲解',
        'summary': course['scope'],
        'en_summary': 'Chinese-guided Spanish grammar from A1 to C1, with interactive practice, feedback and self-assessed writing tasks.',
        'tags': [f"{level['id']} {level['name']}" for level in course['levels']],
        'temas': [{'t': module_number[module['id']], 'es': f"{module['level']} · {module['title']}"} for module in course['modules']],
        'chapters': [{'t': module_number[module['id']], 'code': lesson['id'], 'mods': lesson['id'],
                      'file': f"index.html#lesson-{lesson['id']}", 'es': lesson['title'], 'zh': lesson['title'],
                      'obj': lesson['id'] + '.', 'n': len(lesson['questions']), 'scenes': 0,
                      'quizzes': len(lesson['questions']), 'drills': 1} for module, lesson in all_lessons],
        'capitulos': lessons, 'total': questions, 'scenes': 0, 'quizzes': questions, 'drills': lessons,
        'prefijos': [lesson['id'] + '.' for _, lesson in all_lessons],
    })
    data = json.dumps(catalog, ensure_ascii=False)
    text = text[:match.start(2)] + data + text[match.end(2):]

    search = ('西班牙语 西语 语法 Spanish grammar español A1 A2 B1 B2 C1 ser estar hay gustar 冠词 阴阳性 动词 变位 '
              '过去时 indefinido imperfecto 虚拟式 subjuntivo 条件句 命令式 间接引语 被动 关系从句 por para 话语标记')
    summary = f'中文讲解 A1–C1 语法，通过 {questions} 道互动题与表达任务练习辨析、变位和造句。'
    en_summary = f'Chinese-guided Spanish grammar from A1 to C1, with {questions} interactive questions and writing tasks.'
    card = (f'<a class="course-card" href="zh/spanish-grammar/" data-course="spanish-grammar" data-category="language" '
            f'data-local-only="true" data-search="{html.escape(search)}"><div class="card-top"><span class="course-code">ES A1–C1</span>'
            '<span class="course-domain" data-zh="语言学习" data-en="LANGUAGES">语言学习</span></div>'
            f'<h3 data-zh="{html.escape(course["title"])}" data-en="Spanish Grammar · A1–C1 Interactive Course">{html.escape(course["title"])}</h3>'
            f'<p data-zh="{html.escape(summary)}" data-en="{html.escape(en_summary)}">{html.escape(summary)}</p>'
            f'<div class="card-bottom"><span><span>{lessons}</span> <span data-i18n="lessons">讲</span><span class="progress-label"></span></span>'
            '<span class="card-arrow" aria-hidden="true">↗</span></div></a>')
    card_pattern = r'<a class="course-card" href="zh/spanish-grammar/".*?</a>'
    if len(re.findall(card_pattern, text, re.S)) != 1:
        fail('index.html must contain exactly one Spanish course card')
    text = re.sub(card_pattern, lambda _: card, text, count=1, flags=re.S)
    path.write_text(text, encoding='utf-8')


def build():
    course = load_course(allow_missing='--allow-missing-levels' in sys.argv)
    modules, lessons, questions = counts(course)
    template = (SOURCE / 'player.template.html').read_text(encoding='utf-8')
    if template.count('__COURSE_JSON__') != 1:
        fail('template must contain __COURSE_JSON__ exactly once')
    data = json.dumps(course, ensure_ascii=False, indent=2)
    page = template.replace('__COURSE_JSON__', data.replace('<', '\\u003c'))
    exercises = write_csv(course)
    guide = build_teacher_guide(course)
    readme = (f"{course['title']}\n\n在线入口：{SITE}\n\n用浏览器打开互动课程.html，即可离线学习。\n"
              f"A1–C1 五个级别，{modules}个模块、{lessons}课、{questions}道客观题、{lessons}项表达任务。\n"
              "本地学习记录保存在当前浏览器，请定期导出。在线与离线版本不会自动合并记录。\n"
              "教师用书包含讲解、变位表、答案、反馈与评价标准；JSON及CSV供编辑使用。\n"
              "内容和原创代码：CC BY-NC-SA 4.0；不包含第三方付费课件。\n")
    package = io.BytesIO()
    with zipfile.ZipFile(package, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('互动课程.html', page)
        archive.writestr('教师用书与完整课程.docx', guide)
        archive.writestr('course.json', data + '\n')
        archive.writestr('互动题库.csv', exercises)
        archive.writestr('使用说明.txt', readme)

    (OUT / 'materials').mkdir(parents=True, exist_ok=True)
    (OUT / 'index.html').write_text(page, encoding='utf-8')
    (OUT / 'materials/course.json').write_text(data + '\n', encoding='utf-8')
    (OUT / 'materials/exercises.csv').write_text(exercises, encoding='utf-8', newline='')
    (OUT / 'materials/teacher-guide.docx').write_bytes(guide)
    (OUT / 'materials/course-package.zip').write_bytes(package.getvalue())
    update_homepage(course)
    print(f'Built Spanish grammar course: {len(course["levels"])} levels, {modules} modules, {lessons} lessons, {questions} questions.')


if __name__ == '__main__':
    build()
