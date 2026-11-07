import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../zh/ai/assets/playground.js',import.meta.url),'utf8');
const examples=[...source.matchAll(/code:`([\s\S]*?)`}/g)].map(m=>m[1]);
assert.equal(examples.length,7);
for(const code of examples){const logs=[];vm.runInNewContext(code,{console:{log:(...v)=>logs.push(v)}},{timeout:1000});assert.ok(logs.length);assert.ok(!JSON.stringify(logs).includes('null'),'No NaN/Infinity in numerical examples');}
const {parseHTML}=await import(process.env.OPENSEEI_QA_MODULE || '/tmp/openseei-qa/node_modules/linkedom/esm/index.js');
const {window}=parseHTML('<html><body><h1>注意力</h1><div class="lesson-content"></div></body></html>');
window.COURSE={id:'cme295'};
let timeout;const ctx=vm.createContext({window,document:window.document,console,setTimeout:fn=>{timeout=fn;return 1},clearTimeout:()=>{}});
vm.runInContext(source,ctx);assert.ok(window.document.querySelector('.code-playground'));
const editor=window.document.querySelector('textarea');editor.value='console.log("</script><script>oops</script>")';
window.document.querySelector('.run-code').click();
const frame=window.document.querySelector('iframe');assert.equal(frame.getAttribute('sandbox'),'allow-scripts');assert.ok(frame.srcdoc.includes("connect-src 'none'"));
assert.equal((frame.srcdoc.match(/<\/script>/g)||[]).length,1,'Exactly one valid script closing tag, user input escaped');
const script=frame.srcdoc.match(/<script>([\s\S]*)<\/script>/)[1];new vm.Script(script);
assert.ok(!frame.srcdoc.includes('<script>oops'));
timeout();assert.ok(!window.document.querySelector('iframe'));assert.equal(window.document.querySelector('.run-code').disabled,false);
console.log('PASS 7 runnable examples, sandbox attributes/CSP, script escaping, bootstrap syntax and timeout cleanup. Browser worker execution not visually tested.');
// Independently execute the generated bootstrap and worker source in isolated VMs.
// This covers the generated code contracts, not browser CSP enforcement.
function simulateWorker(code) {
  editor.value=code;window.document.querySelector('.run-code').click();
  const frame=window.document.querySelector('iframe');
  const bootstrap=frame.srcdoc.match(/<script>([\s\S]*)<\/script>/)[1];
  const messages=[];let terminated=0,revoked=0;
  class FakeBlob { constructor(parts){this.source=parts.join('');} }
  const urls=new Map();
  class FakeWorker {
    constructor(url){this.source=urls.get(url).source;}
    postMessage(code){
      const ctx=vm.createContext({self:{},postMessage:msg=>this.onmessage({data:msg})});
      vm.runInContext(this.source,ctx);
      ctx.input=code;vm.runInContext('onmessage({data: input})',ctx,{timeout:1000});
    }
    terminate(){terminated++;}
  }
  vm.runInNewContext(bootstrap,{Blob:FakeBlob,Worker:FakeWorker,URL:{createObjectURL:blob=>{urls.set('blob:opaque',blob);return 'blob:opaque';},revokeObjectURL:()=>revoked++},parent:{postMessage:m=>messages.push(m)}});
  timeout();
  return {messages,terminated,revoked};
}
let worker=simulateWorker('for(let i=0;i<10000;i++) console.log("x");');
assert.ok(worker.messages.filter(m=>m.type==='log').length<=201,'Worker throttles messages before they reach parent');
assert.ok(worker.messages.reduce((n,m)=>n+(m.text?.length||0),0)<=50000,'Worker bounds output traffic');
assert.ok(worker.messages.some(m=>m.type==='done'));assert.equal(worker.terminated,1);assert.equal(worker.revoked,1);
worker=simulateWorker('throw Error("x".repeat(100000));');
assert.equal(worker.messages.find(m=>m.type==='error').text.length,4000,'Worker bounds errors');
worker=simulateWorker('console.log({a:1}); console.log(12n);');
assert.ok(worker.messages.some(m=>m.text?.includes('12')),'BigInt fallback remains printable');
window.document.querySelector('.run-code').click();window.dispatchEvent(new window.Event('hashchange'));
assert.ok(!window.document.querySelector('iframe'),'Route change immediately destroys sandbox');
assert.equal(window.document.querySelector('.run-code').disabled,false);
window.document.querySelector('.run-code').click();window.document.querySelector('.reset-code').click();
assert.ok(!window.document.querySelector('iframe'),'Reset immediately destroys sandbox');
console.log('PASS worker traffic/error limits, blob cleanup, and route/reset cancellation.');
