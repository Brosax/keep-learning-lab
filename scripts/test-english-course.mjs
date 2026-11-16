/** DOM checks for the B2→C1 English course. Layout still needs a browser.
 * node scripts/test-english-course.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {parseHTML}=await import(process.env.OPENSEEI_QA_MODULE || '/tmp/openseei-qa/node_modules/linkedom/esm/index.js');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'zh/english-c1/index.html'),'utf8');
let assertions=0;
function check(value,label){assert.ok(value,label);assertions++;}
function equal(actual,expected,label){assert.equal(actual,expected,label);assertions++;}

const {window}=parseHTML(html);
const {document}=window;
const saved=new Map();
const storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,String(v)),removeItem:k=>saved.delete(k)};
window.matchMedia=()=>({matches:false,addEventListener(){}});
window.scrollTo=()=>{};
window.confirm=()=>false;
const location={href:'https://example.test/zh/english-c1/',pathname:'/zh/english-c1/',hash:'',search:''};
const history={replaceState(_a,_b,url){location.hash=String(url).includes('#')?String(url).slice(String(url).indexOf('#')):'';}};
for (const el of document.querySelectorAll('*')) {
  el.scrollIntoView=()=>{};
  if (!el.focus) el.focus=()=>{};
}
const scripts=[...document.querySelectorAll('script')].filter(script=>!script.src);
check(scripts.length>=2,'course data and player scripts are present');
const context=vm.createContext({
  window, document, localStorage:storage, location, history, console,
  URL, Blob, confirm:()=>false, setTimeout, clearTimeout,
});
vm.runInContext(scripts[1].textContent, context, {filename:'zh/english-c1/index.html'});
check(document.querySelector('#lesson-heading').textContent.includes('从 B2 走到 C1'),'plan is the opening page');
check(document.body.textContent.includes('大约 10 分钟'),'daily ten-minute routine is on the plan');
check(document.body.textContent.includes('Cambridge C1 Advanced'),'exam map names the target exam');
check(document.body.textContent.includes('Reading')||document.body.textContent.includes('阅读与运用'),'exam map covers the written paper');
const milestone=document.querySelector('#lesson-content input[type=checkbox]');
check(milestone,'milestones can be checked');
milestone.checked=true;
milestone.dispatchEvent(new window.Event('change',{bubbles:true}));
const stored=JSON.parse(saved.get('english-c1-course-v1'));
check(Object.values(stored.milestones).includes(true),'milestone is stored locally');
check(stored.questions&&stored.tasks&&stored.observed,'progress keeps the homepage backup shape');

document.querySelector('[data-lesson-id="m1-l1"]').click();
equal(document.querySelector('#lesson-heading').textContent,'一般时与进行时','foundation lesson opens');
check(document.querySelector('table'),'lesson shows a form table');
check(document.querySelector('.en'),'English examples are marked as English');
equal(document.querySelectorAll('.question').length,6,'each lesson has six exercises');
const types=[...document.querySelectorAll('.question')].map(q=>q.textContent);
check(types.some(text=>text.includes('关键词')),'lesson includes a transformation');
check(types.some(text=>text.includes('待修改的句子')),'lesson includes a reveal-answer item');
const first=document.querySelector('.question');
const correct=[...first.querySelectorAll('input[type=radio]')].find(radio=>radio.value==='I usually take the metro to work.');
check(correct,'known multiple-choice answer is present');
correct.checked=true;
first.querySelector('[data-action=check]').click();
check(first.querySelector('.feedback').className.includes('correct'),'multiple choice can be marked correct');
const after=JSON.parse(saved.get('english-c1-course-v1'));
check(after.obj['m1-l1.m1-l1-q1']===true,'solved question is mirrored for the homepage');
check(after.resume==='m1-l1','resume points at the open lesson');

const transform=[...document.querySelectorAll('.question')].find(q=>q.textContent.includes('关键词'));
transform.querySelector('input[type=text]').value='She walks to the office every day.';
transform.querySelector('[data-action=check]').click();
check(transform.querySelector('.feedback').className.includes('correct'),'transformation accepts the model sentence');
const reveal=[...document.querySelectorAll('.question')].find(q=>q.textContent.includes('待修改的句子'));
reveal.querySelector('[data-action=reveal]').click();
check(reveal.querySelector('.feedback').textContent.includes('参考答案'),'reveal shows the model answer');
check(document.querySelector('#review-count').textContent!=='0','revealed item enters the review list');
check(!reveal.className.includes('solved'),'looking at the answer does not count as solved');
check(html.includes('@media(max-width:760px)'),'mobile layout rules are in the page');
check(html.includes('english-c1-course-v1'),'storage key is the local-only course key');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
check(home.includes('data-course="english-c1"'),'homepage course card links the new course');
check(home.includes('zh/english-c1/#plan'),'homepage article links the study plan');
console.log(`PASS english-c1: ${assertions} assertions covering the plan, a foundation lesson, exercises, local progress and homepage links.`);
