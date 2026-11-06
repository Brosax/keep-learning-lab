/** Homepage DOM checks. Does not replace browser layout verification.
 * npm install --prefix /tmp/openseei-qa --cache /tmp/npm-cache linkedom
 * node scripts/test-home.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {parseHTML}=await import(process.env.OPENSEEI_QA_MODULE || '/tmp/openseei-qa/node_modules/linkedom/esm/index.js');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=fs.readFileSync(path.join(root,'assets/home.js'),'utf8');
let assertions=0;
function check(value,label){assert.ok(value,label);assertions++;}
function equal(actual,expected,label){assert.equal(actual,expected,label);assertions++;}
function session(seed={},activity={},signedIn=false){
  const {window}=parseHTML(html),{document}=window;
  // linkedom incorrectly maps digit-containing dataset.i18n to data-i18-n.
  // Browsers use data-i18n; correct only this emulator discrepancy.
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const dataset=el.dataset;
    Object.defineProperty(el,'dataset',{value:new Proxy(dataset,{get(target,key){return key==='i18n'?el.getAttribute('data-i18n'):Reflect.get(target,key);}})});
  }
  const saved=new Map(Object.entries(seed));
  const storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,String(v)),removeItem:k=>saved.delete(k)};
  window.matchMedia=()=>({matches:false,addEventListener(){}});window.scrollTo=()=>{};
  const location={href:'https://example.test/',pathname:'/',hash:'',search:''};
  const dialog=document.querySelector('#learning-dialog');
  dialog.showModal=function(){this.open=true;this.setAttribute('open','');};
  dialog.close=function(){this.open=false;this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
  const calls={sync:0,logout:0,google:0};
  const sync={available:true,activity:()=>activity,status:()=>({state:signedIn?'ok':'off',on:signedIn,user:signedIn?{name:'Test Learner',email:'test@example.test'}:null,text:signedIn?'已同步':'本地模式'}),sync:()=>{calls.sync++;return Promise.resolve();},logout:()=>{calls.logout++;signedIn=false;},renderGoogleButton:()=>{calls.google++;return Promise.resolve(true);},exportBackup:()=>({version:1,courses:{}}),importBackup:()=>true};
  window.SeeiSync=sync;
  const history={replaceState(_a,_b,url){location.href=String(url);}};
  window.location=location;
  const context=vm.createContext({window,document,localStorage:storage,location,history,SeeiSync:sync,CustomEvent:window.CustomEvent,URL,URLSearchParams,Blob,console,setTimeout,clearTimeout,FileReader:class {}});
  vm.runInContext(source,context,{filename:'assets/home.js'});
  function event(el,type){check(el,`${type} target exists`);el.dispatchEvent(new window.Event(type,{bubbles:true}));}
  return {window,document,saved,calls,dialog,event,
    click(selector){event(document.querySelector(selector),'click');},
    input(selector,value){const el=document.querySelector(selector);check(el,selector+' exists');el.value=value;event(el,'input');},
    visible(selector){return [...document.querySelectorAll(selector)].filter(el=>!el.hidden);}
  };
}
const s=session(),d=s.document;
equal(d.querySelectorAll('.course-card').length,8,'all eight courses remain in DOM');
equal(s.visible('.course-card').length,6,'six course cards shown by default');
check(!d.querySelector('#show-all-courses').hidden,'show all control available');
s.click('#show-all-courses');equal(s.visible('.course-card').length,8,'show all expands');
s.click('#show-all-courses');equal(s.visible('.course-card').length,6,'show all collapses');
s.click('[data-filter="ai"]');equal(s.visible('.course-card').length,5,'AI filter shows five courses');equal(d.querySelector('[data-filter="ai"]').getAttribute('aria-pressed'),'true','selected filter announced');
s.click('[data-filter="systems"]');equal(s.visible('.course-card').length,3,'systems filter shows three courses');
s.click('[data-filter="all"]');
s.click('#search-toggle');equal(d.querySelector('#search-toggle').getAttribute('aria-expanded'),'true','search opens accessibly');check(!d.querySelector('#search-panel').hidden,'search panel visible');
s.input('#global-search','RAG');check(s.visible('.article-row').some(el=>el.textContent.includes('RAG')),'search matches articles');
s.input('#global-search','CS229');equal(s.visible('.course-card').length,1,'search matches course code');
s.input('#global-search','gradient');check(s.visible('.lab-card').length>0,'search matches experiment');
s.input('#global-search','__nothing_matches_767__');equal(s.visible('.course-card').length,0,'no unmatched course cards shown');equal(s.visible('.article-row').length,0,'no unmatched articles shown');equal(s.visible('.lab-card').length,0,'no unmatched labs shown');check(!d.querySelector('#global-empty').hidden,'global no-results feedback');
s.click('#search-clear');check(d.querySelector('#global-empty').hidden,'clear dismisses no-results message');equal(s.visible('.course-card').length,6,'clear restores compact course list');
const originalHeading=d.querySelector('h1').textContent;s.click('#language-toggle');check(d.querySelector('h1').textContent!==originalHeading,'locale translates heading');check(d.querySelector('[data-course="emp"]').getAttribute('href').startsWith('en/emp/'),'EMP has real English edition');for(const slug of ['cs229','cs230','cme295','cs336','cs329z'])check(d.querySelector(`[data-course="${slug}"]`).getAttribute('href').startsWith('zh/'),'AI courses retain existing Chinese routes');s.click('#language-toggle');equal(d.querySelector('h1').textContent,originalHeading,'locale returns to Chinese');
s.click('#theme-toggle');equal(s.saved.get('open-seei-theme'),'dark','dark theme persisted');s.click('#theme-toggle');equal(s.saved.get('open-seei-theme'),'light','light theme persisted');
check(d.querySelector('#resume-link').hidden,'no fake resume on empty storage');s.click('#progress-open');check(s.dialog.open,'learning panel opens');s.click('#progress-close');check(!s.dialog.open,'learning panel closes');
const p=session({'cs336-web-v1':JSON.stringify({obj:{'L01.1':true},resume:'01'})});check(!p.document.querySelector('#resume-link').hidden,'saved course gives resume link');check(p.document.querySelector('#resume-link').getAttribute('href').includes('cs336'),'resume points at saved course');check(p.document.querySelector('#resume-link').getAttribute('href').includes('lesson-01'),'resume points at saved lesson');check(p.document.querySelector('[data-course="cs336"] .progress-label').textContent.trim().length>0,'saved progress visible on course card');p.click('#progress-open');check(p.document.querySelector('#learning-list').textContent.includes('CS336'),'learning panel includes saved course');
const unsafe=session({}, {last:{slug:'../../https://evil.test',file:'javascript:alert(1)',title:'<img src=x onerror=alert(1)>',lang:'zh',ts:Date.now()}});const resume=unsafe.document.querySelector('#resume-link');check(resume.hidden || !/javascript:|evil\.test/i.test(resume.getAttribute('href')||''),'unrecognized activity cannot create arbitrary resume URL');check(!resume.querySelector('img'),'activity title cannot inject HTML');
for(const anchor of d.querySelectorAll('a[href]')){
 const href=anchor.getAttribute('href');check(!/^(javascript|data):/i.test(href),'safe anchor URL');
 if(!href || href.startsWith('#') || /^[a-z]+:/i.test(href))continue;
 const clean=decodeURIComponent(href.split(/[?#]/)[0]);let file=path.resolve(root,clean);
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 check(fs.existsSync(file),`local destination exists: ${href}`);
}
const scriptTag=d.querySelector('script[src="sync.js"]');for(const slug of ['cs229','cs230','cme295','cs336','cs329z','micro','emp','ei'])check(scriptTag.getAttribute('data-cursos').includes(`${slug}:${slug}-web-v1`),`sync/backup covers ${slug}`);
console.log(`PASS homepage: ${assertions} assertions covering compact cards, filters, search, locale, theme, learning state, safe resume and local links.`);
console.log('DOM only: browser layout, focus placement and external login are not verified.');
