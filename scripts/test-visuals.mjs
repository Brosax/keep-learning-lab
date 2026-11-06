/** Deterministic DOM/numeric checks. Does not launch a browser or verify layout. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const {parseHTML}=await import(process.env.OPENSEEI_QA_MODULE || '/tmp/openseei-qa/node_modules/linkedom/esm/index.js');
const code=fs.readFileSync(new URL('../zh/ai/assets/visuals.js',import.meta.url),'utf8');
let count=0;
const check=(v,m)=>{assert.ok(v,m);count++;};
const eq=(a,b,m)=>{assert.equal(a,b,m);count++;};
function setup(id,reduced=false){
 const {window}=parseHTML('<html><body><main class="lesson-content"><section class="objectives"></section></main></body></html>');
 window.COURSE={id};window.matchMedia=()=>({matches:reduced});
 const intervals=new Map();let intervalId=0;let period;
 vm.runInNewContext(code,{window,document:window.document,setInterval:(fn,ms)=>{period=ms;intervals.set(++intervalId,fn);return intervalId;},clearInterval:id=>intervals.delete(id)});
 const d=window.document;
 return {window,d,intervals,get period(){return period;},text(selector){return d.querySelector(selector).textContent;},click(action){d.querySelector(`[data-visual-action="${action}"]`).click();},input(value){const el=d.querySelector('input');el.value=String(value);el.dispatchEvent(new window.Event('input',{bubbles:true}));},tick(){for(const fn of [...intervals.values()])fn();}};
}
for(const id of ['cs229','cs230','cme295','cs336','cs329z']){
 const s=setup(id);check(s.d.querySelector('.objectives + .geometry-lab'),`${id} inserted after objectives`);check(s.d.querySelector('svg[role="img"][aria-label]'),`${id} accessible SVG`);
 eq(s.d.querySelector('[data-visual-action="prev"]').disabled,true,`${id} initial prev disabled`);
 let steps=0;
 while(!s.d.querySelector('[data-visual-action="next"]').disabled && steps<20){s.click('next');steps++;check(!/undefined|NaN|Infinity/.test(s.d.querySelector('.geometry-lab').textContent),`${id} finite render step ${steps}`);}
 check(steps>2&&steps<20,`${id} reaches finite final step`);s.click('reset');check(s.text('.geometry-counter').startsWith('1 /'),`${id} reset step`);
 s.click('play');eq(s.intervals.size,1,`${id} one animation timer`);eq(s.period,2200,`${id} default playback cadence`);s.click('play');eq(s.intervals.size,0,`${id} pause timer`);
 s.click('play');s.window.dispatchEvent(new s.window.Event('hashchange'));eq(s.intervals.size,0,`${id} route change stops timer`);
 s.click('play');for(let i=0;i<20;i++)s.tick();eq(s.intervals.size,0,`${id} playback ends automatically`);eq(s.d.querySelector('[data-visual-action="play"]').getAttribute('aria-pressed'),'false',`${id} final play state`);
 s.window.document.dispatchEvent(new s.window.CustomEvent('course:render'));eq(s.d.querySelectorAll('.geometry-lab').length,1,`${id} no duplicate mount`);
 console.log(`PASS ${id}: geometry steps, parameters, accessible SVG and animation lifecycle`);
}
let s=setup('cs229');check(s.text('.geometry-result').includes('4.955'),'quadratic initial loss');s.click('next');check(s.text('.geometry-result').includes('1.954'),'quadratic alpha=.2 one-step loss');s.input(.75);s.click('reset');eq(s.d.querySelector('input').value,'0.2','reset restores learning rate');s.input(.75);s.click('next');check(s.text('.geometry-body').includes('发散'),'unstable learning-rate explanation');check(s.text('.geometry-result').includes('4.112'),'quadratic alpha=.75 one-step loss');
s=setup('cs230');check(s.text('.geometry-result').includes('预测 0.646'),'sigmoid forward value');check(s.text('.geometry-result').includes('损失 0.063'),'half square loss');check(s.text('.geometry-result').includes('权重梯度 -0.162'),'neuron chain-rule gradient');for(let i=0;i<5;i++)s.click('next');check(s.text('.geometry-formula').includes('-0.162'),'final chain-rule displayed');s.input(-2);check(s.text('.geometry-result').includes('预测 0.007'),'parameter input recomputes sigmoid');
s=setup('cme295');s.input(0);for(let i=0;i<3;i++)s.click('next');check(s.text('.geometry-result').includes('权重和 1.000'),'attention normalized');check(s.text('.geometry-formula').includes('(0.436, 0.284)'),'attention weighted output at angle 0');s.input(180);check(s.text('.geometry-formula').includes('(-0.436, 0.284)'),'attention symmetry at angle 180');
s=setup('cs336');s.click('next');s.click('next');eq([...s.d.querySelectorAll('svg text')].filter(e=>e.textContent==='MASK').length,3,'strictly upper triangle causal mask');s.input(1);check(s.text('.geometry-body').includes('前 1 个 token'),'causal horizon follows position');s.click('next');check(s.d.querySelector('svg').textContent.includes('h = [1.000, 0.000, 1.000, 0.000]'),'position one attention reproduces own embedding');s.click('next');const probabilities=[...s.d.querySelectorAll('svg text')].filter(e=>/%$/.test(e.textContent)).map(e=>parseFloat(e.textContent));eq(probabilities.length,5,'five-token toy vocabulary');check(Math.abs(probabilities.reduce((a,b)=>a+b,0)-100)<.2,'next-token probabilities sum to 100%');
s=setup('cs329z');s.input(1);for(let i=0;i<7;i++)s.click('next');check(s.text('.geometry-result').includes('Stop · 已调用 1 次 · 上限 1'),'agent respects one-call budget');check(s.text('.geometry-body').includes('不确定'),'agent stops uncertain without evidence');s.input(2);check(s.text('.geometry-result').includes('Stop · 已调用 2 次 · 上限 2'),'agent evidence path uses two calls');check(s.text('.geometry-body').includes('2024-06-12'),'agent final synthetic answer is visible');
s=setup('cs229',true);s.click('play');eq(s.period,4000,'reduced-motion preference slows playback');s.window.dispatchEvent(new s.window.Event('pagehide'));eq(s.intervals.size,0,'page hide stops playback');
console.log(`PASS ${count} visual DOM/numeric assertions. Browser layout remains unverified.`);
