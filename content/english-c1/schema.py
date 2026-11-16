"""Helpers for the original B2→C1 English course. Content files import these."""


def ex(en, zh):
    return {'en': en, 'zh': zh}


def table(caption, headers, rows):
    return {'caption': caption, 'headers': list(headers), 'rows': [list(row) for row in rows]}


def rule(title, body, examples, table=None, mistakes=None):
    item = {
        'title': title,
        'body': body,
        'examples': [{'en': en, 'zh': zh} for en, zh in examples],
    }
    if table:
        item['table'] = table
    if mistakes:
        item['mistakes'] = [{'wrong': wrong, 'right': right, 'why': why} for wrong, right, why in mistakes]
    return item


def _q(kind, prompt, answer, hint, explanation, error, **extra):
    item = {
        'type': kind,
        'prompt': prompt,
        'answer': answer,
        'hint': hint,
        'explanation': explanation,
        'errorType': error,
    }
    item.update(extra)
    return item


def mc(prompt, options, answer, hint, explanation, error='用法判断'):
    return _q('mc', prompt, answer, hint, explanation, error, options=list(options))


def gap(prompt, answer, hint, explanation, accepted=None, error='形式选择'):
    return _q('text', prompt, answer, hint, explanation, error, accepted=list(accepted or []))


def transform(source, keyword, answer, hint, explanation, accepted=None, prompt=None):
    return _q(
        'transform',
        prompt or '改写下面的句子，使意思基本不变。必须使用给出的关键词，不要改变关键词本身。',
        answer,
        hint,
        explanation,
        '句子改写',
        source=source,
        keyword=keyword,
        accepted=list(accepted or []),
    )


def reveal(stem, answer, hint, explanation, accepted=None, prompt=None):
    return _q(
        'reveal',
        prompt or '下面的句子是中文母语者常写出的样子。先改成自然的英语，需要时再显示参考答案。',
        answer,
        hint,
        explanation,
        '中式英语',
        stem=stem,
        accepted=list(accepted or []),
    )


def task(prompt, model, rubric):
    return {'prompt': prompt, 'model': model, 'rubric': list(rubric)}


def lesson(module_id, number, title, goal, minutes, exam, notice, rules, questions, task):
    lesson_id = f'{module_id}-l{number}'
    numbered = []
    for index, question in enumerate(questions, 1):
        item = dict(question)
        item['id'] = f'{lesson_id}-q{index}'
        numbered.append(item)
    return {
        'id': lesson_id,
        'title': title,
        'goal': goal,
        'minutes': minutes,
        'exam': exam,
        'notice': {
            'prompt': notice[0],
            'examples': [{'en': en, 'zh': zh} for en, zh in notice[1]],
            'answer': notice[2],
        },
        'rules': list(rules),
        'questions': numbered,
        'task': task,
    }


def module(module_id, level, title, description, lessons):
    return {
        'id': module_id,
        'level': level,
        'title': title,
        'description': description,
        'lessons': list(lessons),
    }
