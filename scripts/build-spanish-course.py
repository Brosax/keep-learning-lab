#!/usr/bin/env python3
"""Build the Spanish grammar course from editable source files, offline."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/spanish-grammar'
OUT = ROOT / 'zh/spanish-grammar'


def build():
    course = json.loads((SOURCE / 'course.json').read_text(encoding='utf-8'))
    ids = set()
    lessons = [lesson for module in course['modules'] for lesson in module['lessons']]
    questions = [q for lesson in lessons for q in lesson['questions']]
    assert len(course['modules']) == 8 and len(lessons) == 16 and len(questions) == 96
    for lesson in lessons:
        assert len(lesson['questions']) == 6 and len(lesson['task']['rubric']) == 3
        assert lesson['goal'] and lesson['notice']['examples'] and lesson['rules']
        for q in lesson['questions']:
            assert q['id'] not in ids, q['id']
            ids.add(q['id'])
            assert q['type'] in ('mc', 'text') and q['hint'] and q['explanation']
            if q['type'] == 'mc':
                assert q['answer'] in q['options']
    template = (SOURCE / 'player.template.html').read_text(encoding='utf-8')
    assert template.count('__COURSE_JSON__') == 1
    data = json.dumps(course, ensure_ascii=False, indent=2)
    (OUT / 'materials').mkdir(parents=True, exist_ok=True)
    (OUT / 'index.html').write_text(template.replace('__COURSE_JSON__', data.replace('<', '\\u003c')), encoding='utf-8')
    (OUT / 'materials/course.json').write_text(data + '\n', encoding='utf-8')
    with (OUT / 'materials/exercises.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.writer(stream)
        writer.writerow(['题目ID','模块','课时','题型','题干','选项JSON','正确答案','亦可接受JSON','首次错答提示','解析','错误维度'])
        for module in course['modules']:
            for lesson in module['lessons']:
                for q in lesson['questions']:
                    writer.writerow([q['id'],module['title'],lesson['title'],q['type'],q['prompt'],json.dumps(q.get('options',[]),ensure_ascii=False),q['answer'],json.dumps(q.get('accepted',[]),ensure_ascii=False),q['hint'],q['explanation'],q['errorType']])
    print('Built Spanish grammar course: 8 modules, 16 lessons, 96 questions.')


if __name__ == '__main__':
    build()
