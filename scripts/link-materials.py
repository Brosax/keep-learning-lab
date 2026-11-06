#!/usr/bin/env python3
"""Attach verified downloads to editable course sources; keep failures auditable."""
from pathlib import Path
from urllib.parse import unquote
import json,re
ROOT=Path(__file__).resolve().parents[1]
STAGING=Path('/workspace/materials')
def canon(u):return unquote(u.replace('https://github.com/','https://raw.githubusercontent.com/').replace('/blob/','/')).rstrip('/')
for slug in ['cs329z','cs336','cme295','cs229','cs230']:
 p=ROOT/'content'/f'{slug}.json'
 if not p.exists():continue
 d=json.loads(p.read_text()); downloads=json.loads((STAGING/slug/'root-downloads.json').read_text())
 good={canon(r['url']):r for r in downloads if r['status']=='downloaded'}
 # Recover moved CS229 classic notes using the verified official archive.
 for r in list(good.values()):
  if '/notes_archive/' in r['url']:good[canon(r['url'].replace('/notes_archive/','/notes/'))]=r
 used=set()
 for resource in d.get('resources',[])+[r for l in d['lessons'] for r in l.get('resources',[])]:
  r=good.get(canon(resource.get('url','')))
  if r:
   resource['url']=r['url'];used.add(canon(r['url']))
   if r['bytes']<=90_000_000:resource['local']=r['local']
   else:resource.pop('local',None);resource['note']='完整仓库已下载归档；大文件通过官方源下载。'
  elif resource.get('local') and not (STAGING/slug/Path(resource['local']).name).is_file():resource.pop('local',None)
 for r in downloads:
  if r['status']!='downloaded' or canon(r['url']) in used:continue
  if any(k in r['filename'] for k in ['anonSurvey','related-classes','honor-code']):continue
  title=r['filename'].replace('_',' ').removesuffix('.pdf').removesuffix('.zip')
  title=re.sub(r'^[a-f0-9]{8}-','',title)
  typ='code' if r['filename'].endswith(('.zip','.py','.ipynb')) else 'slides' if r['filename'].endswith('.pptx') else 'pdf'
  resource={'title':title,'url':r['url'],'type':typ}
  if r['bytes']<=90_000_000:resource['local']=r['local']
  else:resource['note']='完整仓库已下载归档；大文件通过官方源下载。'
  d.setdefault('resources',[]).append(resource);used.add(canon(r['url']))
 p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
 # Preserve exact provenance and every unsuccessful discovery attempt.
 sources={'discovered_at':'2026-11-06','course':slug,'downloaded':sum(r['status']=='downloaded' for r in downloads),'bytes':sum(r.get('bytes',0) for r in downloads if r['status']=='downloaded'),'records':downloads,'discovery_pages':[v.name for v in (STAGING/slug).glob('official-*.html')],'note':'Historical website links may be stale; successful archive replacements are mapped in course resources. A failed URL is not represented as a local file.'}
 (STAGING/slug/'sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2))
 print(slug, sources['downloaded'],'downloads linked')
