import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const { parseHTML } = await import(process.env.OPENSEEI_QA_MODULE || '/tmp/openseei-qa/node_modules/linkedom/esm/index.js');
const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const answersSource = read('assets/engineering-answers.js');
const answersPath = '../../assets/engineering-answers.js';

for (const directory of ['zh/micro', 'zh/emp', 'en/emp', 'es/emp']) {
  const micro = directory === 'zh/micro';
  const drill = micro ? 'led' : 'drift';
  const { window } = parseHTML('<html><body><div data-drill="' + drill + '"></div></body></html>');
  const math = Object.create(Math);
  math.random = () => 0.5;
  const context = vm.createContext({ window, document: window.document, Math: math });
  vm.runInContext(answersSource, context);
  vm.runInContext(read(directory + '/assets/practice.js'), context);

  const practice = window.MICROPractice;
  const item = practice.GEN[drill].make(math.random);
  const box = window.document.querySelector('[data-drill]');
  const input = box.querySelector('input');
  const wrongUnit = micro ? 'ms' : 'Ω';
  const rightUnit = micro ? 'kΩ' : 's';
  input.value = item.ans + ' ' + wrongUnit;
  box.querySelector('[data-a="check"]').click();
  assert.ok(box.querySelector('.fb.no'), directory + ' rejects mismatched units');

  box.querySelector('[data-a="show"]').click();
  assert.ok(box.querySelector('.fb ol li'), directory + ' renders the worked answer');
  input.value = (item.ans / 1000).toPrecision(8) + ' ' + rightUnit;
  box.querySelector('[data-a="check"]').click();
  assert.ok(box.querySelector('.fb.ok'), directory + ' grades equivalent units');
  assert.match(box.querySelector('.tally').textContent, /0\s*\/\s*1/, 'A retry must not count twice');

  for (const filename of fs.readdirSync(new URL(directory + '/', root)).filter(name => name.endsWith('.html'))) {
    const { document: page } = parseHTML(read(directory + '/' + filename));
    for (const line of page.querySelectorAll('pre.code > code > span')) {
      assert.ok(line.classList.contains('ln-row'), directory + '/' + filename + ' has an unformatted code line');
    }
    const scripts = [...page.querySelectorAll('script[src]')].map(s => s.getAttribute('src'));
    if (scripts.includes('assets/practice.js')) {
      assert.ok(scripts.includes(answersPath) && scripts.indexOf(answersPath) < scripts.indexOf('assets/practice.js'), directory + '/' + filename);
    }
  }
}

const standalone = {};
vm.runInNewContext(answersSource, { window: standalone });
const { check } = standalone.EngineeringAnswers;
for (const [expected, unit, input] of [
  [1e6, 'Hz', '1 MHz'], [25, 'ms', '0,025 s'], [1, 'ms', '1000 µs'],
  [-2, 'percent', '−2%'], [2, 'days', '48 h'], [4700, 'ohm', '4.7e3']
]) {
  assert.ok(check({kind:'num', unit, ans:expected}, input), input);
}
for (const input of ['1xxx', '1 2', '1e', '1 mHz', '1 s', '', '1 Infinity', '1constructor']) {
  assert.equal(check({kind:'num', unit:'Hz', ans:1}, input), false, input);
}
assert.ok(check({kind:'dec', ans:1000}, '1 000'));
assert.equal(check({kind:'dec', ans:4096}, '1 000'), false);
assert.ok(check({kind:'hex', ans:16}, '10'));
assert.ok(check({kind:'hex', ans:16}, '0x10'));
console.log('PASS engineering numeric feedback, conversions, grading and script loading across four readers.');
