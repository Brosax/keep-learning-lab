/** Reviewed-course integration and independent numerical checks.
 * node scripts/test-reviewed-course.mjs cs230
 * Requires linkedom at OPENSEEI_QA_MODULE or /tmp/openseei-qa/node_modules.
 * Uses a DOM emulator and Node VM; does not verify rendered browser layout.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {parseHTML}=await import(process.env.OPENSEEI_QA_MODULE || '/tmp/openseei-qa/node_modules/linkedom/esm/index.js');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const slug=process.argv[2]||'cs230';
assert.ok(['cs230','cme295','cs336','cs329z'].includes(slug),'supply a reviewed course slug');
const expectedCourse=JSON.parse(fs.readFileSync(path.join(root,`content/${slug}.json`),'utf8'));
assert.equal(expectedCourse.experimentsMode,'lesson','course must opt into explicit lesson experiments');
assert.ok(Array.isArray(expectedCourse.experimentScripts)&&expectedCourse.experimentScripts.length,'course must declare experimentScripts');
const lessonCount=expectedCourse.lessons.length;
assert.equal(lessonCount,{cs230:18,cme295:9,cs336:17,cs329z:19}[slug],'review retains the full course');
const experimentFiles=expectedCourse.experimentScripts.map(file=>path.posix.normalize(`zh/${slug}/${file}`));
const index=fs.readFileSync(path.join(root,`zh/${slug}/index.html`),'utf8');
const scriptSources=[...index.matchAll(/<script\s+src="([^"]+)"/g)].map(match=>match[1]);
const files=scriptSources.map(src=>path.posix.normalize(`zh/${slug}/${src.split('?')[0]}`));
const scripts=new Map(files.map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')]));
let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
function eq(actual,expected,message){assert.equal(actual,expected,message);checks++;}
function close(actual,expected,tolerance,message){check(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,`${message}: expected ${expected}, received ${actual}`);}
function plain(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
function normalizedCode(code){return code.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,(all,quoted)=>quoted||'').replace(/\s+/g,'');}
function finiteTree(value,label){
 if(typeof value==='number')check(Number.isFinite(value),`${label} is finite`);
 else if(Array.isArray(value))value.forEach((item,index)=>finiteTree(item,`${label}[${index}]`));
 else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value))finiteTree(item,`${label}.${key}`);
}
function createSession({mutateCourse,missingRegistry=false,initialStorage=[]}={}){
 const dom=parseHTML('<!doctype html><html><head></head><body><div id="course-app"></div></body></html>');
 // Linkedom's default window forwards arbitrary writes to Node's global object.
 // Keep course registries local so a missing script cannot borrow an earlier tab's demos.
 const window=new Proxy(Object.create(null),{get:(target,key)=>key==='window'?window:Object.hasOwn(target,key)?target[key]:dom.window[key],set:(target,key,value)=>{target[key]=value;return true;}});
 const {document}=window;const storage=new Map(initialStorage);
 Object.defineProperty(window.HTMLInputElement.prototype,'checked',{configurable:true,get(){return this.hasAttribute('checked');},set(v){this.toggleAttribute('checked',!!v);}});
 const location={hash:'',search:'',pathname:`/zh/${slug}/`,href:`https://example.test/zh/${slug}/`};
 window.location=location;window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});window.scrollTo=()=>{};
 const intervals=new Map(),timeouts=new Map();let timerId=0;
 const schedule=(map,callback,delay)=>{const id=++timerId;map.set(id,{callback,delay});return id;};
 class MutationObserver{observe(){}disconnect(){}}
 const context=vm.createContext({window,document,location,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))},CustomEvent:window.CustomEvent,MutationObserver,console,Blob,URL,
  setInterval:(callback,delay)=>schedule(intervals,callback,delay),clearInterval:id=>intervals.delete(id),setTimeout:(callback,delay)=>schedule(timeouts,callback,delay),clearTimeout:id=>timeouts.delete(id)});
 for(const [file,source] of scripts){
  if(file==='zh/ai/assets/course.js'&&mutateCourse)mutateCourse(window.COURSE);
  if(missingRegistry&&experimentFiles.includes(file))continue;
  vm.runInContext(source,context,{filename:file,timeout:2000});
 }
 return {window,document,context,location,storage,intervals,timeouts,
  go(id){location.hash=id.startsWith('#')?id:`#lesson-${id}`;window.dispatchEvent(new window.Event('hashchange'));},
  click(selector){const element=document.querySelector(selector);check(element,`click target exists: ${selector}`);element.click();},
  input(selector,value){const element=document.querySelector(selector);check(element,`input target exists: ${selector}`);element.value=String(value);element.dispatchEvent(new window.Event('input',{bubbles:true}));},
  tick(){for(const {callback} of [...intervals.values()])callback();}
 };
}

for(const file of experimentFiles){const src=path.relative(`zh/${slug}`,file).split(path.sep).join('/');check(index.includes(src),`published HTML loads ${src}`);check(index.indexOf(src)<index.indexOf('../ai/assets/visuals.js'),'registry loads before visual reader');check(index.indexOf(src)<index.indexOf('../ai/assets/playground.js'),'registry loads before code reader');}
for(const src of scriptSources){const url=new URL(src,'https://example.test/zh/'+slug+'/');const file=path.join(root,url.pathname);const version=url.searchParams.get('v');check(version&&crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').startsWith(version),`${src} cache version matches shipped bytes`);}
const s=createSession(),d=s.document;
eq(s.window.COURSE.id,slug,'real generated course has requested identity');
eq(s.window.COURSE.experimentsMode,'lesson',`${slug} uses explicit lesson experiments`);
assert.deepEqual(plain(s.window.COURSE),expectedCourse,'generated data.js matches editable course source');checks++;
eq(s.window.COURSE.lessons.length,lessonCount,'all lessons retained');
const hashes=new Set(),visualTitles=new Set(),codeTitles=new Set();const outputs={};
for(const lesson of s.window.COURSE.lessons){
 const id=`${slug}-${lesson.id}`;
 check(lesson.sections.some(section=>section.kind==='worked-example'),`${id} includes a worked numerical example`);
 eq(lesson.quiz.length,2,`${id} has two revised questions`);
 for(const question of lesson.quiz){eq(question.options.length,4,`${id} has four plausible answer choices`);check(question.explanation?.length>15,`${id} explains the answer`);}

 eq(lesson.visual,id,`lesson ${lesson.id} explicit visual key`);eq(lesson.codeDemo,id,`lesson ${lesson.id} explicit code key`);
 const visual=s.window.COURSE_VISUALS?.[id],code=s.window.COURSE_CODE?.[id];check(visual,`${id} visual registered`);check(code,`${id} code registered`);
 check(!visualTitles.has(visual.title),`${id} visual title is chapter-specific`);visualTitles.add(visual.title);
 check(!codeTitles.has(code.name),`${id} code title is chapter-specific`);codeTitles.add(code.name);
 check(typeof code.code==='string'&&code.code.trim().length>80,`${id} contains executable implementation`);
 const hash=crypto.createHash('sha256').update(normalizedCode(code.code)).digest('hex');check(!hashes.has(hash),`${id} implementation differs from every other chapter`);hashes.add(hash);
 check(Array.isArray(code.instructions)&&code.instructions.length>0,`${id} gives an experiment task`);check(code.expected,`${id} states expected observations`);
 const logs=[];const capture=(...args)=>{args.forEach((arg,index)=>finiteTree(arg,`${id} output ${index}`));logs.push(plain(args));};
 vm.runInNewContext(code.code,{console:{log:capture,table:capture,warn:capture,error:capture}},{filename:`${id}-example.js`,timeout:1000});check(logs.length>0,`${id} code produces inspectable results`);outputs[id]=logs;
 s.go(lesson.id);eq(d.querySelector('h1').textContent,lesson.title,`${id} renders the correct lesson`);
 eq(d.querySelectorAll('.geometry-lab').length,1,`${id} mounts one diagram`);eq(d.querySelectorAll('.lab-panel').length,0,`${id} does not duplicate a generic course lab`);eq(d.querySelectorAll('.code-playground').length,1,`${id} mounts one code lab`);
 eq(d.querySelector('.geometry-lab').getAttribute('data-visual-id'),id,`${id} rendered visual ID`);eq(d.querySelector('.code-playground').getAttribute('data-code-id'),id,`${id} rendered code ID`);
 eq(d.querySelector('.geometry-lab h2').textContent,visual.title,`${id} displays own visual title`);eq(d.querySelector('#code-editor').value,code.code,`${id} editor starts with its own code`);
 const options=[...d.querySelectorAll('.code-playground select option')];check(options.length<=1,`${id} does not expose the unrelated global seven-demo menu`);if(options.length)eq(options[0].getAttribute('value'),id,`${id} menu stays on lesson demo`);
 check(d.querySelector('.geometry-lab svg[role="img"][aria-label]'),`${id} has a labeled mathematical diagram`);
 check(Array.isArray(visual.steps)&&visual.steps.length>=2,`${id} includes a real sequence`);
 for(const key of ['min','max','step','value'])check(typeof visual[key]==='number'&&Number.isFinite(visual[key]),`${id} slider ${key} is finite numeric data`);
 check(visual.step>0&&visual.max>=visual.min,`${id} slider has ordered bounds and a positive step`);
 check(visual.value>=visual.min&&visual.value<=visual.max,`${id} slider default lies inside its bounds`);
 const defaultTicks=(visual.value-visual.min)/visual.step;
 check(Math.abs(defaultTicks-Math.round(defaultTicks))<1e-7,`${id} slider default is aligned to min plus integer steps`);
 const sampleValues=[visual.min,visual.value,visual.max];
 for(const value of sampleValues){
  for(let step=0;step<visual.steps.length;step++){
   const result=visual.render(step,value);
   for(const field of ['svg','formula','body','result','note'])check(typeof result[field]==='string',`${id}/${step} provides ${field}`);
   check(!/(?:undefined|NaN|Infinity)/.test(result.svg+' '+result.formula+' '+result.result),`${id}/${step}/${value} yields finite mathematics`);
   if(result.metrics)finiteTree(result.metrics,`${id}/${step}/${value}`);
   const svgDocument=parseHTML(`<svg>${result.svg}</svg>`).document;
   for(const shape of svgDocument.querySelectorAll('rect,circle,ellipse'))for(const attribute of ['width','height','r','rx','ry']){
    const raw=shape.getAttribute(attribute);if(raw===null)continue;
    const dimension=Number(raw);check(Number.isFinite(dimension)&&dimension>=0,`${id}/${step}/${value} ${shape.localName}.${attribute} is a nonnegative finite SVG size`);
   }
  }
 }
 const finalStep=visual.steps.length-1;
 const atMin=visual.render(finalStep,visual.min),atMax=visual.render(finalStep,visual.max);
 check(atMin.svg!==atMax.svg||atMin.result!==atMax.result||atMin.formula!==atMax.formula,`${id} parameter changes mathematical output`);
 for(let step=1;step<visual.steps.length;step++){s.click('[data-visual-action="next"]');eq(d.querySelector('.geometry-explanation h3').textContent,visual.steps[step],`${id} step ${step} has its own explanation`);}
 check(d.querySelector('[data-visual-action="next"]').disabled,`${id} sequence reaches its last step`);
 s.click('[data-visual-action="reset"]');eq(Number(d.querySelector('.geometry-parameters input').value),visual.value,`${id} reset restores default parameter`);
 s.input('.geometry-parameters input',visual.max);eq(Number(d.querySelector('.geometry-parameters output').textContent),visual.max,`${id} parameter input is wired`);
 s.click('[data-visual-action="play"]');eq(s.intervals.size,1,`${id} starts exactly one animation`);s.go('#overview');eq(s.intervals.size,0,`${id} leaving the chapter cancels animation`);
}
eq(hashes.size,lessonCount,'all executable implementations differ');eq(visualTitles.size,lessonCount,'all lesson diagram titles differ');
const answerCounts=[0,0,0,0],questions=new Set();
for(const lesson of expectedCourse.lessons)for(const question of lesson.quiz){answerCounts[question.answer]++;check(!questions.has(question.question),'quiz questions are not duplicated between chapters');questions.add(question.question);}
check(Math.max(...answerCounts)-Math.min(...answerCounts)<=2,'correct options are reasonably balanced across positions');
// A newly reviewed course cannot accidentally ship another course's entire example.
for(const other of ['cs229','cs230','cme295','cs336','cs329z'].filter(id=>id!==slug)){
 const data=JSON.parse(fs.readFileSync(path.join(root,`content/${other}.json`),'utf8'));
 const registrySources=data.experimentScripts||(other==='cs229'?['assets/lab-core.js','assets/labs-01-08.js','assets/labs-09-15.js','assets/labs-16-22.js']:[]);
 if(data.experimentsMode!=='lesson'||!registrySources.length)continue;
 const w={},ctx=vm.createContext({window:w,console});
 for(const src of registrySources)vm.runInContext(fs.readFileSync(path.resolve(root,`zh/${other}`,src),'utf8'),ctx,{timeout:2000});
 for(const [id,example] of Object.entries(w.COURSE_CODE||{})){
  const fingerprint=crypto.createHash('sha256').update(normalizedCode(example.code)).digest('hex');
  check(!hashes.has(fingerprint),`${slug} does not copy the complete executable example ${id}`);
 }
}
// Rendering a route twice must not accumulate diagrams or workers.
s.go('02');s.window.document.dispatchEvent(new s.window.CustomEvent('course:render',{detail:{course:slug,lesson:'02',container:d.querySelector('main')}}));eq(d.querySelectorAll('.geometry-lab').length,1,'repeated render notification does not duplicate diagrams');eq(d.querySelectorAll('.code-playground').length,1,'repeated render notification does not duplicate editors');
s.click('.run-code');check(d.querySelector('iframe[sandbox="allow-scripts"]'),'runnable lesson uses the existing isolated sandbox');s.go('03');check(!d.querySelector('iframe'),'chapter transition cancels active worker sandbox');eq(s.timeouts.size,0,'chapter transition clears code execution timeout');
s.click('[data-visual-action="play"]');s.window.dispatchEvent(new s.window.Event('pagehide'));eq(s.intervals.size,0,'page hide clears animation timer');
// Missing explicit keys or missing registry must never silently restore generic gradient descent.
for(const mutation of [course=>{delete course.lessons[0].visual;delete course.lessons[0].codeDemo;},course=>{course.lessons[0].visual='missing-visual';course.lessons[0].codeDemo='missing-code';}]){
 const absent=createSession({mutateCourse:mutation});absent.go('01');eq(absent.document.querySelectorAll('.geometry-lab').length,0,'missing explicit visual does not fall back');eq(absent.document.querySelectorAll('.code-playground').length,0,'missing explicit code does not fall back');
}
const noRegistry=createSession({missingRegistry:true});noRegistry.go('01');eq(noRegistry.document.querySelectorAll('.geometry-lab').length,0,'failed visual registry load does not show an unrelated diagram');eq(noRegistry.document.querySelectorAll('.code-playground').length,0,'failed code registry load does not show unrelated regression');
console.log(`PASS ${slug}: ${lessonCount} distinct lesson bindings/programs, parameter behavior, missing-config behavior, and lifecycle (${checks} assertions).`);
function metrics(id,step,value){const config=s.window.COURSE_VISUALS[`${slug}-${id}`];const result=config.render(step??config.steps.length-1,value??config.value);check(result.metrics&&typeof result.metrics==='object',`${slug}-${id} exposes numerical results`);return result.metrics;}
function logged(id,key){for(const args of outputs[`${slug}-${id}`])for(const value of args)if(value&&typeof value==='object'&&!Array.isArray(value)&&Object.hasOwn(value,key))return value;throw new Error(`${slug}-${id} code did not log ${key}`);}
function outputObjects(id){return outputs[`${slug}-${id}`].flat().filter(value=>value&&typeof value==='object'&&!Array.isArray(value));}
// A question revision invalidates old answers without losing notes or objectives.
check(typeof s.window.COURSE.quizRevision==='string'&&s.window.COURSE.quizRevision.length>0,'revised course versions its quizzes');
const storageKey=`${slug}-web-v1`;const legacyState={obj:{'L01.1':true},quiz:{L01:{answers:{0:0}}},notes:{'01':'保留我的学习笔记'},resume:'01',quizRevision:'obsolete-revision'};
const migrated=createSession({initialStorage:[[storageKey,JSON.stringify(legacyState)]]});let saved=JSON.parse(migrated.storage.get(storageKey));assert.deepEqual(saved.quiz,{},'quiz revision clears obsolete answers');checks++;assert.deepEqual(saved.obj,legacyState.obj,'quiz migration preserves objectives');checks++;assert.deepEqual(saved.notes,legacyState.notes,'quiz migration preserves notes');checks++;eq(saved.resume,'01','quiz migration preserves resume location');eq(saved.quizRevision,s.window.COURSE.quizRevision,'quiz migration stores current revision');
migrated.go('01');check(migrated.document.querySelector('[data-objective="0"]').checked,'preserved objective appears checked');eq(migrated.document.querySelector('#lesson-note').value,legacyState.notes['01'],'preserved note appears in editor');check(migrated.document.querySelector('.quiz-panel').textContent.includes('题目已更新'),'migration explains why previous answers were cleared');eq(migrated.document.querySelectorAll('.quiz-option[aria-pressed="true"]').length,0,'outdated quiz answers do not appear selected');
const answer=s.window.COURSE.lessons[0].quiz[0].answer;migrated.click(`.quiz-option[data-question="0"][data-answer="${answer}"]`);saved=JSON.parse(migrated.storage.get(storageKey));eq(saved.quiz.L01.answers[0],answer,'new answer is saved under current revision');
const restored=createSession({initialStorage:[...migrated.storage]});restored.go('01');eq(restored.document.querySelector(`.quiz-option[data-question="0"][data-answer="${answer}"]`).getAttribute('aria-pressed'),'true','current-revision answer survives reload');eq(restored.document.querySelector('#lesson-note').value,legacyState.notes['01'],'note survives revised quiz reload');

// A source library represents unique archived files; chapter readings keep their own URLs.
const resourceFixture=createSession({mutateCourse:course=>{
 course.resources=[
  {title:'Local A',type:'notes',local:'materials/shared.pdf',url:'https://one.example/shared.pdf'},
  {title:'Local B alias',type:'notes',local:'materials/shared.pdf',url:'https://two.example/download.pdf'},
  {title:'Remote page one',type:'notes',url:'https://one.example/remote.pdf#page=1'},
  {title:'Remote page nine',type:'notes',url:'https://one.example/remote.pdf#page=9'},
  {title:'Different local A',type:'notes',local:'materials/distinct-a.pdf',url:'https://one.example/same-url.pdf'},
  {title:'Different local B',type:'notes',local:'materials/distinct-b.pdf',url:'https://one.example/same-url.pdf'}
 ];
 for(const lesson of course.lessons)lesson.resources=[];
 course.lessons[0].resources=[{title:'Chapter-specific reading',type:'notes',local:'materials/shared.pdf',url:'https://chapter.example/shared.pdf#page=7'}];
}});
resourceFixture.go('#resources');
const resourceTitles=[...resourceFixture.document.querySelectorAll('.resource-grid .resource-card h3')].map(element=>element.textContent).sort();
assert.deepEqual(resourceTitles,['Local A','Remote page one','Different local A','Different local B'].sort(),'source library deduplicates local aliases and remote page anchors while preserving distinct local files');checks++;
resourceFixture.go('01');
eq(resourceFixture.document.querySelector('.lesson-aside .resource-link a').getAttribute('href'),'https://chapter.example/shared.pdf#page=7','chapter reading retains its precise original URL');

const oraclePath=path.join(root,'scripts/oracles',`${slug}.mjs`);
check(fs.existsSync(oraclePath),`${slug} has an independent numerical oracle module`);
const {default:verify}=await import(pathToFileURL(oraclePath).href);
const covered=new Set();
const mark=id=>{check(expectedCourse.lessons.some(lesson=>lesson.id===id),`${id} oracle belongs to this course`);covered.add(id);};
await verify({metrics,logged,outputObjects,outputs,check,eq,close,plain,mark,deep:(a,b,message)=>{assert.deepEqual(plain(a),plain(b),message);checks++;}});
eq(covered.size,lessonCount,'independent numerical oracles cover every chapter');
console.log(`PASS ${slug}: ${lessonCount} independent chapter oracles and quiz migration (${checks} total assertions).`);
