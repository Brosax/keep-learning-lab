#!/usr/bin/env python3
"""Build the five community study courses from tracked JSON; no network required."""
import json, re, html, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
COURSES=['cs329z','cs336','cme295','cs229','cs230']
# Validate the editable homepage before writing any generated files.
p=ROOT/'index.html';text=p.read_text()
pattern=r'(<script id="catalog-data" type="application/json">)(.*?)(</script>)'
m=re.search(pattern,text,re.S)
if m is None:
    raise SystemExit('Cannot update course catalog: index.html is missing the <script id="catalog-data" type="application/json"> block. Restore that block before running this generator.')
try:
    catalog=json.loads(m[2])
except json.JSONDecodeError as exc:
    raise SystemExit(f'Cannot update course catalog: index.html contains invalid catalog-data JSON: {exc}') from exc
for slug in COURSES:
    data=json.loads((ROOT/'content'/f'{slug}.json').read_text())
    out=ROOT/'zh'/slug
    out.mkdir(parents=True,exist_ok=True)
    (out/'data.js').write_text('window.COURSE = '+json.dumps(data,ensure_ascii=False).replace('</','<\\/')+';\n')
    scoped=data.get('experimentsMode')=='lesson'
    experiment_files=data.get('experimentScripts') or {
        'cs229':['assets/lab-core.js','assets/labs-01-08.js','assets/labs-09-15.js','assets/labs-16-22.js']
    }.get(slug,[]) if scoped else []
    if scoped:
        if not isinstance(experiment_files,list) or any(not isinstance(file,str) or not file.endswith('.js') for file in experiment_files):
            raise SystemExit(f'Invalid chapter experiment scripts for {slug}')
        for lesson in data['lessons']:
            expected=f'{slug}-{lesson["id"]}'
            # Diagrams and code demos are optional per lesson, but a declared one must use the lesson's own key.
            for key in ('visual','codeDemo'):
                if key in lesson and lesson[key]!=expected:
                    raise SystemExit(f'Invalid explicit chapter experiment: {expected} {key}')
            if any(key in lesson for key in ('visual','codeDemo')) and not experiment_files:
                raise SystemExit(f'No chapter experiment scripts configured for {slug}')
    def asset_url(relative):
        file=out/relative
        if not file.is_file():
            raise SystemExit(f'Missing course asset: {file}')
        return relative+'?v='+hashlib.sha256(file.read_bytes()).hexdigest()[:12] if scoped else relative
    script_files=['data.js',*experiment_files,'../ai/assets/course.js','../ai/assets/labs.js','../ai/assets/playground.js','../ai/assets/visuals.js']
    scripts=''.join(f'<script src="{asset_url(file)}"></script>' for file in script_files)
    stylesheet=asset_url('../ai/assets/course.css')
    title=html.escape(data['title']);desc=html.escape(data['description'],quote=True)
    links=''.join(f'<li><a href="#lesson-{l["id"]}">{html.escape(l["title"])}</a></li>' for l in data['lessons'])
    (out/'index.html').write_text(f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{data['code']} · {title} — Keep Learning Lab</title><meta name="description" content="{desc}">
<meta name="theme-color" content="#F4F2EC"><link rel="icon" href="../ai/assets/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{stylesheet}"></head><body>
<div id="course-app"></div><noscript><main><h1>{title}</h1><p>{html.escape(data['description'])}</p><p>交互学习需要启用 JavaScript。原始资料仍可从 <a href="{html.escape(data['sourceUrl'],quote=True)}">官方课程站</a> 获取。</p><a href="sources.json">下载资料索引</a><ul>{links}</ul></main></noscript>
{scripts}
</body></html>''')
# Add courses to the existing catalog, preserving all other data and layout.
catalog['published']=[c for c in catalog['published'] if c['slug'] not in COURSES]
for existing in catalog['published']:
    existing.setdefault('zh',existing.get('zh_title',''))
    existing.setdefault('en',existing.get('en_title',''))
for slug in COURSES:
    d=json.loads((ROOT/'content'/f'{slug}.json').read_text()); modules={v['id']:i+1 for i,v in enumerate(d['modules'])}
    chapters=[{'t':modules[l['module']],'code':'L'+l['id'],'mods':'L'+l['id'],'file':'index.html#lesson-'+l['id'],'es':l['originalTitle'],'zh':l['title'],'obj':'L'+l['id']+'.','n':len(l['objectives']),'scenes':1 if l.get('lab') or l.get('visual') else 0,'quizzes':len(l['quiz']),'drills':1} for l in d['lessons']]
    course={'code':d['code'],'slug':slug,'zh':d['title'],'en':d['subtitle'],'zh_title':d['title'],'en_title':d['subtitle'],'es':d['subtitle'],'subtitle':d['year']+' · 社区中文导学','category':'AI / 人工智能','summary':d['description'],'en_summary':d['description'],'tags':[m['title'] for m in d['modules']],'key':slug+'-web-v1','has_en':False,'temas':[{'t':i+1,'es':v['title']} for i,v in enumerate(d['modules'])],'chapters':chapters,'capitulos':len(chapters),'total':sum(c['n'] for c in chapters),'scenes':sum(c['scenes'] for c in chapters),'quizzes':sum(c['quizzes'] for c in chapters),'drills':len(chapters),'prefijos':[c['obj'] for c in chapters]}
    catalog['published'].append(course)
text=text[:m.start(2)]+json.dumps(catalog,ensure_ascii=False)+text[m.end(2):]
p.write_text(text)
print('Built courses:', ', '.join(COURSES))
# Unified learning path: foundations -> deep learning -> LLMs -> training -> agents.
order=['cs229','cs230','cme295','cs336','cs329z']
items=[json.loads((ROOT/'content'/f'{slug}.json').read_text()) for slug in order]
cards=''.join(f'''<a class="path-card" href="../{d['id']}/"><span class="path-num">{i+1:02}</span><div><small>{d['code']} / {html.escape(d['year'])}</small><h2>{html.escape(d['title'])}</h2><p>{html.escape(d['description'])}</p><span class="path-meta">{len(d['lessons'])} 讲 · {len(d['modules'])} 个模块 · 中文导学 + 原始资料</span></div><b aria-hidden="true">↗</b></a>''' for i,d in enumerate(items))
(ROOT/'zh/ai/index.html').write_text('''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AI 学习路径 · 五门 Stanford 课程 — Keep Learning Lab</title><meta name="description" content="从机器学习、深度学习到大语言模型与AI Agent：五门Stanford课程的中文社区导学、课件下载与互动练习。"><link rel="icon" href="assets/icon.svg"><style>
:root{--bg:#F4F2EC;--ink:#121316;--muted:#62666b;--line:#d5d0c5;--accent:#d84315}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 system-ui,-apple-system,"Noto Sans SC",sans-serif}a{color:inherit;text-decoration:none}header{border-bottom:2px solid var(--ink);display:flex;justify-content:space-between;padding:20px 5vw;font:600 14px ui-monospace,monospace}header span{color:var(--accent)}main{max-width:1180px;margin:auto;padding:70px 28px}small,.eyebrow{font:500 12px/1.6 ui-monospace,monospace;letter-spacing:.08em}h1{font-size:clamp(38px,6vw,76px);letter-spacing:-.05em;line-height:1.15;margin:24px 0}h1 em{font-style:normal;color:var(--accent)}.intro{max-width:740px;font-size:18px;color:var(--muted)}.stats{display:flex;gap:50px;padding:30px 0;border-bottom:2px solid var(--ink)}.stats strong{font:500 42px ui-monospace,monospace}.stats span{display:block;font-size:12px;color:var(--muted)}.section-label{display:flex;justify-content:space-between;margin:50px 0 16px;font:500 12px ui-monospace,monospace}.path-card{display:grid;grid-template-columns:80px 1fr 40px;gap:24px;padding:34px 22px;border-top:1px solid var(--line);transition:background .2s}.path-card:hover{background:#eae6dd}.path-num{font:500 40px ui-monospace,monospace;color:var(--accent)}h2{margin:8px 0;font-size:25px}.path-card p{color:var(--muted);max-width:850px;margin:8px 0}.path-meta{font-size:12px}.path-card b{font-size:32px;font-weight:400}.note{border:1px solid var(--line);padding:24px;margin-top:35px}.note h3{margin:0 0 12px}.note p{margin:10px 0;color:var(--muted)}footer{border-top:2px solid var(--ink);margin-top:50px;padding-top:20px;font-size:12px;color:var(--muted)}a:focus-visible{outline:3px solid var(--accent);outline-offset:4px}@media(max-width:620px){main{padding:40px 20px}.path-card{grid-template-columns:38px 1fr;gap:12px;padding:26px 0}.path-num{font-size:25px}.path-card b{display:none}.stats{gap:25px}.stats strong{font-size:32px}h2{font-size:22px}.section-label span:last-child{display:none}}
</style></head><body><header><a href="../../">KEEP LEARNING LAB <span>//</span></a><span>AI / 学习路径</span></header><main><p class="eyebrow">THE AI CURRICULUM / 从原理到系统</p><h1>理解模型。<br>训练模型。<em>构建智能。</em></h1><p class="intro">把五门课程串成一条可以循序完成的学习路径。从机器学习的数学基础出发，走向深度学习、大语言模型与 Agent 工程。每一讲都有中文解释、动手任务、自测与可追溯的原始资料。</p><div class="stats"><div><strong>05</strong><span>课程路径</span></div><div><strong>'''+str(sum(len(d['lessons']) for d in items))+'''</strong><span>中文导学讲次</span></div><div><strong>LOCAL</strong><span>本地保存学习进度</span></div></div><div class="section-label"><span>01 / 推荐学习顺序</span><span>已有基础？从任意一门开始 ↘</span></div>'''+cards+'''<section class="note"><h3>怎样使用这套课程</h3><p>先读中文讲解，完成目标勾选与自测，再打开相应的原始讲义。每讲的实践任务是社区练习；官方作业要求仍以课程网站为准。</p><p>CS229 与 CS230 建立基础；CME295 衔接 Transformer 与语言模型；CS336 侧重从零实现和训练；CS329Z 侧重 Agent 系统工程。这里的先后关系是社区自学建议，不是学校的选课要求。</p><p>资料库标注来源与学期。公开 PDF 与代码按实际下载情况归档；视频提供原始链接，学校登录或授权平台内的内容不包含在下载中。</p></section><footer>Keep Learning Lab 中文社区导学 · 非 Stanford 官方课程 · 原始资料版权及许可归原作者所有。</footer></main></body></html>''')
