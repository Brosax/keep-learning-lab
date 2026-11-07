#!/usr/bin/env python3
"""Browser integration checks. Requires Python playwright and Chromium.

Run: python scripts/test-spanish-course.py
The server binds to localhost only and exits after the test.
"""
import json
import threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        source = json.loads((ROOT/'content/spanish-grammar/course.json').read_text(encoding='utf-8'))
        total = sum(len(q['questions']) for level in source['levels']
                    for module in json.loads((ROOT/'content/spanish-grammar'/level['file']).read_text(encoding='utf-8'))['modules']
                    for q in module['lessons'])
        page.goto(origin + '/zh/spanish-grammar/#lesson-m6-l2')
        expect(page.locator('.level-nav[data-level=A1]')).to_have_attribute('open', '')
        expect(page.locator('.level-nav')).to_have_count(len(source['levels']))
        expect(page.locator('#lesson-heading')).to_contain_text('谁喜欢')
        q = page.locator('[data-question-id="m6-l2-q4"]')
        q.locator('input[type=text]').fill('nos')
        q.locator('[data-action=check]').click()
        expect(q.locator('.feedback')).to_contain_text('回答正确')
        stored = page.evaluate("JSON.parse(localStorage.getItem('spanish-grammar-course-v1'))")
        assert stored['obj']['m6-l2.m6-l2-q4'] is True
        assert stored['resume'] == 'm6-l2'
        page.reload()
        expect(page.locator('#solved-metric')).to_have_text(f'1 / {total}')
        # Accent-only misses get a dedicated hint instead of the generic one.
        page.goto(origin + '/zh/spanish-grammar/#lesson-m8-l1')
        accent = page.locator('[data-question-id="m8-l1-q5"]')
        accent.locator('input[type=text]').fill('estan')
        accent.locator('[data-action=check]').click()
        expect(accent.locator('.feedback')).to_contain_text('重音符号')
        accent.locator('.accent-keys button[aria-label="插入 á"]').click()
        assert accent.locator('input[type=text]').input_value() == 'estaná'
        # A C1 lesson renders a conjugation table and is reachable by deep link.
        page.goto(origin + '/zh/spanish-grammar/#lesson-m27-l1')
        expect(page.locator('.level-nav[data-level=C1]')).to_have_attribute('open', '')
        expect(page.locator('table.conj').first).to_be_visible()
        page.goto(origin + '/zh/spanish-grammar/#lesson-m6-l2')
        page.get_by_role('link', name='← Keep Learning Lab 首页').click()
        page.locator('[data-filter=language]').click()
        expect(page.locator('.course-card:visible')).to_have_count(1)
        card = page.locator('[data-course=spanish-grammar]')
        expect(card.locator('.progress-label')).to_contain_text('%')
        expect(page.locator('#resume-link')).to_have_attribute('href', 'zh/spanish-grammar/index.html#lesson-m6-l2')
        page.screenshot(path='/tmp/openseei-spanish-home.png', full_page=False)
        page.locator('#resume-link').click()
        expect(page.locator('#lesson-heading')).to_contain_text('谁喜欢')
        page.locator('[data-lesson-id=m1-l1]').click()
        assert page.url.endswith('#lesson-m1-l1')
        page.set_viewport_size({'width': 390, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        page.screenshot(path='/tmp/openseei-spanish-mobile.png')
        for file in ['teacher-guide.docx','course-package.zip','course.json','exercises.csv']:
            response = context.request.get(origin + '/zh/spanish-grammar/materials/' + file)
            assert response.status == 200, file
            if file.endswith(('.docx','.zip')):
                assert response.body().startswith(b'PK'), file
        embedded = json.loads(page.locator('#course-data').text_content())
        assert embedded['title'] == source['title'] and sum(len(l['questions']) for m in embedded['modules'] for l in m['lessons']) == total
        assert not errors, errors
        browser.close()
        print('PASS Spanish integration: deep links, progress mirror, homepage category, resume, downloads, mobile layout, source consistency.')
finally:
    server.shutdown()
