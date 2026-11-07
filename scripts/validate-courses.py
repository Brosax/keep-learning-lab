#!/usr/bin/env python3
"""Check content completeness, local source files and generated entrypoints."""
import json, hashlib, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
errors=[]; totals={'courses':0,'lessons':0,'quizzes':0,'local_resources':0}
for path in sorted((ROOT/'content').glob('*.json')):
    d=json.loads(path.read_text()); slug=d['id']; totals['courses']+=1
    modules={m['id'] for m in d['modules']}; ids=set(); local=set()
    for lesson in d['lessons']:
        tag=f'{slug}/{lesson["id"]}'; totals['lessons']+=1
        if lesson['id'] in ids:errors.append(tag+' duplicate ID')
        ids.add(lesson['id'])
        if lesson['module'] not in modules:errors.append(tag+' unknown module')
        # exercise is optional; resources may be empty only when sourceStatus explains the missing lecture material.
        for key in ['title','originalTitle','summary','objectives','quiz','sections']+([] if lesson.get('sourceStatus') else ['resources']):
            if not lesson.get(key):errors.append(tag+' missing '+key)
        if len(lesson.get('sections',[]))<2:errors.append(tag+' needs >=2 sections')
        if len(lesson.get('quiz',[]))<2:errors.append(tag+' needs >=2 quizzes')
        for q in lesson.get('quiz',[]):
            totals['quizzes']+=1
            if not isinstance(q['answer'],int) or not 0<=q['answer']<len(q['options']):errors.append(tag+' invalid answer')
            if not q.get('explanation'):errors.append(tag+' missing explanation')
    for r in d.get('resources',[])+[r for l in d['lessons'] for r in l.get('resources',[])]:
        if r.get('url') and not r['url'].startswith(('https://','http://')):errors.append(slug+' invalid source '+r['url'])
        if r.get('local'):
            file=(ROOT/'zh'/slug/r['local']).resolve()
            if not file.is_relative_to(ROOT):errors.append(slug+' resource escapes site')
            if not file.is_file():errors.append(slug+' missing file '+str(file))
            elif file.suffix.lower()=='.pdf' and not file.read_bytes().startswith(b'%PDF-'):errors.append(str(file)+' not PDF')
            local.add(str(file))
    totals['local_resources']+=len(local)
    for name in ['index.html','data.js','sources.json']:
        if not (ROOT/'zh'/slug/name).is_file():errors.append(slug+' missing generated '+name)
if totals['courses']!=5:errors.append(f'expected 5 courses, got {totals["courses"]}')
if errors:
    print('\n'.join(errors));sys.exit(1)
print('PASS',json.dumps(totals,ensure_ascii=False))
