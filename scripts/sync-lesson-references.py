"""Rebuild zh/<course>/sources.json lesson_references from the lessons' own resources.

Usage: python scripts/sync-lesson-references.py <course> [<course> ...]

content/<course>.json is the source of truth for which lesson cites which file. A
resource with a local copy matches by its local path; an external link matches by
URL without the #fragment. Every other field in sources.json is left untouched.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def base(url):
    return (url or '').split('#')[0]


def sync(slug):
    course = json.loads((ROOT / 'content' / f'{slug}.json').read_text(encoding='utf8'))
    path = ROOT / 'zh' / slug / 'sources.json'
    sources = json.loads(path.read_text(encoding='utf8'))
    changed = 0
    for resource in sources.get('resources', []):
        refs = []
        for lesson in course['lessons']:
            for cited in lesson.get('resources', []):
                same_local = resource.get('local') and cited.get('local') == resource['local']
                same_link = not resource.get('local') and resource.get('url') and base(cited.get('url')) == base(resource['url'])
                if same_local or same_link:
                    refs.append({'lesson_id': lesson['id'], 'title': cited.get('title', ''), 'url': cited.get('url', resource.get('url', ''))})
        if refs != resource.get('lesson_references', []):
            resource['lesson_references'] = refs
            changed += 1
    path.write_text(json.dumps(sources, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(f'{slug}: updated lesson_references on {changed} resources')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    for slug in sys.argv[1:]:
        sync(slug)
