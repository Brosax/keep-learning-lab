#!/usr/bin/env python3
"""Import fetched materials referenced by course data and create a verified public index.
Usage: python scripts/import-materials.py /workspace/materials
The downloaded staging tree is separate from the reproducible website source.
"""
import sys, json, hashlib, shutil, datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
staging=Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/materials')
for cp in sorted((ROOT/'content').glob('*.json')):
    d=json.loads(cp.read_text())
    if not isinstance(d,dict) or 'id' not in d:continue
    slug=d['id'];dest=ROOT/'zh'/slug;dest.mkdir(parents=True,exist_ok=True)
    records=[];seen=set()
    for r in d.get('resources',[])+[r for l in d['lessons'] for r in l.get('resources',[])]:
        key=(r.get('url'),r.get('local'))
        if key in seen:continue
        seen.add(key)
        item=dict(r)
        if r.get('local'):
            relative=Path(r['local']);target=(dest/relative).resolve()
            if not target.is_relative_to(dest.resolve()):raise ValueError('Unsafe local path '+str(relative))
            options=[staging/slug/relative,staging/slug/relative.name]
            existing=next((p for p in options if p.is_file()),None)
            if existing is None:
                matches=list((staging/slug).rglob(relative.name))
                if len(matches)==1:existing=matches[0]
            if existing:
                target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(existing,target)
            if not target.is_file():raise FileNotFoundError(f'{slug}: {relative}')
            raw=target.read_bytes()
            if relative.suffix.lower()=='.pdf' and not raw.startswith(b'%PDF-'):raise ValueError('Invalid PDF '+str(target))
            item.update(status='downloaded',bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
        else:item.setdefault('status','external_link')
        records.append(item)
    index={'course':slug,'title':d['title'],'offering':d['year'],'source_url':d['sourceUrl'],'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Official publicly accessible course materials discovered from course pages and official repositories; videos and restricted materials remain source links. See discovery metadata for crawl scope and failures.','resources':records}
    raw_manifest=staging/slug/'sources.json'
    if raw_manifest.is_file():
        index['discovery']=json.loads(raw_manifest.read_text())
    (dest/'sources.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
    print(slug,len(records),'sources,',sum(r.get('status')=='downloaded' for r in records),'downloaded')
