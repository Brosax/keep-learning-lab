/** DOM interaction checks (not browser/layout verification).
 * npm install --prefix /tmp/openseei-qa --cache /tmp/npm-cache linkedom
 * node scripts/test-courses.mjs
 * Set OPENSEEI_QA_MODULE to a linkedom entrypoint to use a different installation.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {parseHTML}=await import(process.env.OPENSEEI_QA_MODULE || '/tmp/openseei-qa/node_modules/linkedom/esm/index.js');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=fs.readFileSync(path.join(root,'zh/ai/assets/course.js'),'utf8');
const labs=fs.readFileSync(path.join(root,'zh/ai/assets/labs.js'),'utf8');
let assertions=0;
function check(value,message){assert.ok(value,message);assertions++;}
function eq(actual,expected,message){assert.equal(actual,expected,message);assertions++;}
function session(course,storage=new Map(),hash='') {
  const {window}=parseHTML('<!doctype html><html><head></head><body><div id="course-app"></div></body></html>');
  const {document}=window;
  Object.defineProperty(window.HTMLInputElement.prototype,'checked',{configurable:true,get(){return this.hasAttribute('checked');},set(v){this.toggleAttribute('checked',!!v);}});
  window.COURSE=course;window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});window.scrollTo=()=>{};
  const location={hash,pathname:`/zh/${course.id}/`,href:`https://example.test/zh/${course.id}/${hash}`};
  const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))};
  class MutationObserver {observe(){} disconnect(){}}
  const context=vm.createContext({window,document,location,localStorage,CustomEvent:window.CustomEvent,MutationObserver,console});
  vm.runInContext(script,context,{filename:'course.js'});vm.runInContext(labs,context,{filename:'labs.js'});
  const api={window,document,storage,location,context,
    go(hash){location.hash=hash;window.dispatchEvent(new window.Event('hashchange'));window.CourseLabs.mount();},
    event(el,type){check(el,`event ${type} target exists`);el.dispatchEvent(new window.Event(type,{bubbles:true}));},
    click(selector){this.event(document.querySelector(selector),'click');},
    input(selector,value,type='input'){const el=document.querySelector(selector);check(el,`${selector} exists`);el.value=String(value);this.event(el,type);},
    saved(){return JSON.parse(storage.get(`${course.id}-web-v1`)||'{}');}
  };
  return api;
}
function mockCourse(){return {id:'cs336',code:'CS336',title:'测试课程',subtitle:'Test course',description:'学习课程',year:'2026',sourceUrl:'https://cs336.stanford.edu/',instructors:['Test'],prerequisites:['Python'],modules:[{id:'one',title:'基础',description:'基础概念'}],lessons:['attention','scaling','retrieval','evaluation'].map((lab,i)=>({id:String(i+1).padStart(2,'0'),module:'one',title:`第${i+1}课`,originalTitle:lab,summary:'理解机制',objectives:['理解概念','完成练习'],sections:[{title:'原理',body:'中文讲解',code:'a < b'}],exercise:{title:'练习',instructions:['实验一次'],deliverable:'笔记'},quiz:[{question:'正确选项？',options:['错误','正确'],answer:1,explanation:'这是解析。'}],resources:[{title:`PDF ${i}`,url:`https://example.org/${i}.pdf`,local:`materials/${i}.pdf`,type:'pdf'}],lab})),resources:[{title:'官方视频',type:'video',url:'https://example.org/video'}],assignments:[]};}
function safeLinks(doc){for(const a of doc.querySelectorAll('a[href]')) check(!/^(?:javascript|data|vbscript):/i.test(a.getAttribute('href')),`safe URL ${a.getAttribute('href')}`);}
function runCourse(course){
  const s=session(course),d=s.document;
  eq(d.querySelectorAll('.lesson-card').length,course.lessons.length,`${course.code}: all lessons listed`);
  eq(d.querySelector('[data-home-link]').getAttribute('href'),'../../','home path');
  check(d.querySelector('.header-links a[href]') || d.querySelector('.header-links select'),'cross-course navigation');
  const f=course.lessons[0];s.input('#lesson-search','__no_match_765__');eq(d.querySelectorAll('.lesson-card').length,0,'no-match lesson search');s.input('#lesson-search','');eq(d.querySelectorAll('.lesson-card').length,course.lessons.length,'clear lesson search');
  for(const lesson of course.lessons){
    s.go('#lesson-'+lesson.id);eq(d.querySelector('h1').textContent,lesson.title,`route ${lesson.id}`);
    eq(d.querySelectorAll('[data-objective]').length,lesson.objectives.length,`objectives ${lesson.id}`);
    eq(d.querySelectorAll('.quiz-question').length,lesson.quiz.length,`quizzes ${lesson.id}`);
    eq(d.querySelectorAll('.lesson-section').length,lesson.sections.length,`sections ${lesson.id}`);
    check(d.querySelector('#lesson-note'),'note editor');safeLinks(d);
  }
  s.go('#lesson-'+f.id);
  const objective=d.querySelector('[data-objective="0"]');objective.checked=true;s.event(objective,'change');eq(s.saved().obj[`L${f.id}.1`],true,'objective persisted');
  if(f.objectives.every((_,i)=>s.saved().obj[`L${f.id}.${i+1}`])) s.click('#complete-lesson');
  s.click('#complete-lesson');check(f.objectives.every((_,i)=>s.saved().obj[`L${f.id}.${i+1}`]),'complete button persists all objectives');
  s.input('#lesson-note','我的笔记 <script>alert(1)</script>');eq(s.saved().notes[f.id],'我的笔记 <script>alert(1)</script>','note persisted');check(!d.querySelector('#lesson-note script'),'note stays text');
  // linkedom does not decode character references inside textarea as browsers do.
  s.input('#lesson-note','我的笔记：实验成功。');
  const question=f.quiz[0],wrong=(question.answer+1)%question.options.length;
  s.click(`[data-question="0"][data-answer="${wrong}"]`);check(d.querySelector('.quiz-feedback.incorrect'),'incorrect feedback');
  s.click(`[data-question="0"][data-answer="${question.answer}"]`);check(d.querySelector('.quiz-feedback.correct'),'correct feedback');eq(s.saved().quiz[`L${f.id}`].answers[0],question.answer,'quiz persisted');
  const restored=session(course,s.storage,'#lesson-'+f.id);eq(restored.document.querySelector('#lesson-note').value,'我的笔记：实验成功。','note reload');check(restored.document.querySelector('[data-objective="0"]').checked,'objective reload');check(restored.document.querySelector('.quiz-feedback.correct'),'quiz reload');
  s.go('#resources');const total=d.querySelectorAll('.resource-card').length;check(total>0,'resource catalog');s.input('#resource-search','__no_match_765__');eq(d.querySelectorAll('.resource-card').length,0,'resource search empty');s.input('#resource-search','');eq(d.querySelectorAll('.resource-card').length,total,'resource search clear');
  for(const button of Array.from(d.querySelectorAll('[data-resource-filter]'))){s.event(button,'click');const type=button.dataset.resourceFilter;eq(button.getAttribute('aria-pressed'),'true',`filter ${type} selected`);if(type!=='all') check(d.querySelectorAll('.resource-card').length<=total,'filtered count');}
  s.click('[data-resource-filter="all"]');safeLinks(d);s.go('#lesson-nonexistent');check(d.querySelector('h1').textContent.includes('没有找到'),'unknown route fallback');
  s.click('.theme-toggle');eq(d.documentElement.dataset.theme,'dark','dark toggle');s.click('.menu-toggle');eq(d.querySelector('.menu-toggle').getAttribute('aria-expanded'),'true','mobile menu opens');s.go('#overview');eq(d.querySelector('.menu-toggle').getAttribute('aria-expanded'),'false','navigation closes menu');
  console.log(`PASS ${course.code}: ${course.lessons.length} lesson routes, progress/quiz/notes reload, search, resources, navigation`);
}
function runLabs(){
 const s=session(mockCourse()),d=s.document;
 s.go('#lesson-01');let values=[...d.querySelectorAll('#att-bars strong')].map(e=>parseFloat(e.textContent));eq(values[3],0,'causal mask removes future weight');check(Math.abs(values.reduce((a,b)=>a+b,0)-100)<0.2,'attention probabilities sum to 100%');const mask=d.querySelector('#att-mask');mask.checked=false;s.event(mask,'input');values=[...d.querySelectorAll('#att-bars strong')].map(e=>parseFloat(e.textContent));check(values[3]>values[1],'unmasked largest score has largest weight');s.input('#att-temp',0.1);check(parseFloat(d.querySelectorAll('#att-bars strong')[3].textContent)>99,'low temperature concentrates probability');
 s.go('#lesson-02');let m=[...d.querySelectorAll('#scale-result strong')].map(e=>e.textContent);eq(m[0],'5.88','6ND in ZFLOP');eq(m[1],'20.0','tokens per parameter');eq(m[2],'14 GB','BF16 weights');s.input('#scale-n',14);eq(d.querySelector('#scale-result strong').textContent,'11.76','compute scales with N');
 s.go('#lesson-03');eq(d.querySelectorAll('.sim-doc').length,2,'Top-k initial count');check(d.querySelector('.sim-doc').textContent.startsWith('D1 / 分数 2'),'retrieval ranks matching doc');s.input('#retr-query','工具 错误');check(d.querySelector('.sim-doc').textContent.startsWith('D2 / 分数 2'),'query changes ranking');s.input('#retr-k',1);eq(d.querySelectorAll('.sim-doc').length,1,'Top-k changes results');s.input('#retr-query','');check(d.querySelector('#retr-result').textContent.includes('请输入'),'empty retrieval query');
 s.go('#lesson-04');m=[...d.querySelectorAll('#eval-result strong')].map(e=>e.textContent);eq(m[0],'80 / 100','success count');eq(m[1],'80.0%','sample proportion');eq(m[2],'71.1–86.7%','Wilson interval known example');s.input('#eval-p',0);check(d.querySelector('#eval-result').textContent.includes('0.0–3.7%'),'zero-success interval');s.input('#eval-p',100);check(d.querySelector('#eval-result').textContent.includes('96.3–100.0%'),'all-success interval');
 console.log('PASS interactive labs: attention, scaling, retrieval, Wilson confidence interval');
}
let real=0;
for(const name of fs.readdirSync(path.join(root,'content')).filter(n=>n.endsWith('.json'))){const file=path.join(root,'content',name);const data=JSON.parse(fs.readFileSync(file,'utf8'));if(data.lessons && data.modules){runCourse(data);real++;}}
if(!real){console.log('No course JSON yet; running representative fixture. Re-run after content is generated.');runCourse(mockCourse());}
runLabs();
console.log(`PASS ${assertions} assertions. DOM tests do not verify browser layout or remote resources.`);
