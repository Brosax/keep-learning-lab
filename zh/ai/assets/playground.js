/* Editable, offline numerical exercises. Executes only inside an opaque sandbox + worker. */
(() => {
'use strict';
const demos = {
regression: {name:'梯度下降 · 拟合一条直线',code:`// 改学习率 lr，观察损失的变化。数据已缩放到 [0,1]。
const x = [0, .25, .5, .75, 1], y = [1, 1.5, 2, 2.5, 3];
let w = 0, b = 0;
const lr = 0.3;
for (let step = 0; step <= 100; step++) {
  const errors = x.map((v, i) => w*v + b - y[i]);
  const loss = errors.reduce((s, e) => s + e*e, 0) / x.length;
  if (step % 20 === 0) console.log({step, loss, w, b});
  w -= lr * 2 * errors.reduce((s,e,i) => s+e*x[i],0)/x.length;
  b -= lr * 2 * errors.reduce((s,e) => s+e,0)/x.length;
}
console.log('目标直线：y = 2x + 1');`},
gradient: {name:'反向传播 · 用有限差分检查导数',code:`// 一个神经元 z = wx+b, a = sigmoid(z), L = (a-y)^2
const x = 2, y = 1, b = -0.2, w = 0.3;
const sigmoid = z => 1/(1+Math.exp(-z));
const loss = w => (sigmoid(w*x+b)-y)**2;
const a = sigmoid(w*x+b);
const analytic = 2*(a-y)*a*(1-a)*x;
const eps = 1e-5;
const numerical = (loss(w+eps)-loss(w-eps))/(2*eps);
console.log({activation:a, loss:loss(w), analytic, numerical});
console.log('绝对误差', Math.abs(analytic-numerical));
// 尝试把 eps 改为 1 或 1e-16，解释数值误差。`},
attention: {name:'Attention · 从点积到加权和',code:`const q = [1, 0], keys = [[1,0],[0,1],[1,1]];
const values = [[2,0],[0,2],[3,3]];
const temperature = 1;
const logits = keys.map(k => k.reduce((s,v,i)=>s+v*q[i],0)/Math.sqrt(q.length)/temperature);
const max = Math.max(...logits);
const exps = logits.map(z=>Math.exp(z-max));
const total = exps.reduce((a,b)=>a+b,0);
const weights = exps.map(e=>e/total);
const output = q.map((_,j)=>weights.reduce((s,p,i)=>s+p*values[i][j],0));
console.log({logits, weights, output});
// 改 q 的方向：关注对象怎样改变？降低温度后输出更靠近哪个 value？`},
scaling: {name:'训练预算 · 比较参数与 token',code:`// 稠密模型教学近似 C ≈ 6ND。固定计算预算，比较数据量。
const budget = 6e21; // FLOP
for (const n of [1e9, 3e9, 7e9, 13e9, 70e9]) {
  const tokens = budget/(6*n);
  console.log({parametersB:n/1e9, tokensB:tokens/1e9, tokensPerParameter:tokens/n});
}
// 这只是预算，不是性能预测；数据质量、训练配置和硬件效率都没有包含。`},
retrieval: {name:'检索 · 评估 Precision 与 Recall',code:`const retrieved = ['doc2','doc4','doc7'];
const relevant = new Set(['doc2','doc7','doc9','doc11']);
const hits = retrieved.filter(x=>relevant.has(x)).length;
console.log({hits, precision:hits/retrieved.length, recall:hits/relevant.size});
// 加入 doc9，再加入一个无关文档，观察 precision/recall 如何变化。
// 评估检索质量与回答质量要分别测量。`},
agent: {name:'Agent · 一个可检查的工具循环',code:`// 完全本地的确定性策略示例，不调用LLM或真实外部工具。
const tools = { add: ({a,b}) => {
  if (![a,b].every(Number.isFinite)) throw Error('参数必须是有限数字');
  return a+b;
}};
const plan = [{tool:'add',args:{a:17,b:25}}];
let state = {steps:0, observation:null};
for (const action of plan) {
  if (++state.steps > 3) throw Error('超出步数预算');
  if (!Object.hasOwn(tools, action.tool)) throw Error('工具未授权');
  state.observation = tools[action.tool](action.args);
  console.log('工具轨迹', {action, observation:state.observation});
}
console.log('最终结果',state.observation);
// 将工具改成 delete 或参数改成字符串，观察边界校验。`},
clustering: {name:'K-means · 分配与移动中心',code:`const points = [[1,1],[1,2],[2,1],[7,7],[8,7],[7,8]];
let centers = [[0,0],[3,3]];
for (let step=0;step<5;step++) {
  const labels=points.map(p=>{
    const d=centers.map(c=>p.reduce((s,v,j)=>s+(v-c[j])**2,0));
    return d.indexOf(Math.min(...d));
  });
  centers=centers.map((c,k)=>{
    const group=points.filter((_,i)=>labels[i]===k);
    return group.length ? c.map((_,j)=>group.reduce((s,p)=>s+p[j],0)/group.length):c;
  });
  console.log({step,labels,centers});
}
// 改变初始中心或加入离群点，观察结果。`}
};
const defaults={cs229:'regression',cs230:'gradient',cme295:'attention',cs336:'scaling',cs329z:'agent'};
let cancelActiveRun = null;
const cancelRun = message => { if (cancelActiveRun) cancelActiveRun(message); };
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mount() {
 cancelRun('已停止：已切换学习内容');
 const content=document.querySelector('.lesson-content');
 if(!content||content.querySelector('.code-playground'))return;
 const course=window.COURSE;
 const lesson=course.lessons?.find(item=>item.id===content.dataset.lessonId);
 const scoped=course.experimentsMode==='lesson';
 let selected;
 let available;
 if(scoped){
   selected=lesson?.codeDemo;
   const demo=window.COURSE_CODE?.[selected];
   if(!demo)return;
   available={[selected]:demo};
 }else{
   available=demos;
   selected=defaults[course.id]||'regression';
   const title=document.querySelector('h1')?.textContent||'';
   if(/检索|Retriev|RAG/.test(title))selected='retrieval';
   if(/注意力|Attention|Transformer/i.test(title))selected='attention';
   if(/聚类|K-means/i.test(title))selected='clustering';
 }
 const demo=available[selected];
 const host=document.createElement('section');host.className='code-playground';host.dataset.codeId=selected;
 host.innerHTML=`<p class="eyebrow">CODE LAB / 修改 · 运行 · 解释</p><h2>${scoped?escape(demo.name):'直接运行一段代码'}</h2><p>用 JavaScript 数值实验验证机制，无需安装或 API Key。官方 Python / PyTorch 作业请见原始资料。本实验与正式作业独立。</p>${scoped?'':`<label>选择实验 <select class="demo-select">${Object.entries(available).map(([id,d])=>`<option value="${id}" ${id===selected?'selected':''}>${escape(d.name)}</option>`).join('')}</select></label>`}${scoped&&demo.instructions?.length?`<ol class="code-tasks">${demo.instructions.map(item=>`<li>${escape(item)}</li>`).join('')}</ol>`:''}<label class="sr-only" for="code-editor">可编辑实验代码</label><textarea id="code-editor" spellcheck="false" autocapitalize="off" rows="16"></textarea><div class="code-controls"><button type="button" class="btn primary run-code">运行代码 ▶</button><button type="button" class="btn secondary reset-code">重置示例</button><span class="code-state" role="status">本地沙箱 · 最长 3 秒 · 禁用网络</span></div><pre class="code-output" aria-live="polite">运行结果将显示在这里。</pre>${scoped&&demo.expected?`<details class="code-expected"><summary>参考结果与检验方法</summary><p>${escape(demo.expected)}</p></details>`:''}`;
 const exercise=content.querySelector('.exercise-panel');
 if(scoped&&exercise)exercise.before(host);else content.append(host);
 const editor=host.querySelector('textarea'),output=host.querySelector('.code-output'),run=host.querySelector('.run-code'),status=host.querySelector('.code-state');
 editor.value=available[selected].code;
 host.querySelector('select')?.addEventListener('change',e=>{cancelRun('已停止：已切换实验');selected=e.target.value;editor.value=available[selected].code;output.textContent='已切换实验，修改后运行。';});
 host.querySelector('.reset-code').addEventListener('click',()=>{cancelRun('已停止：已重置示例');editor.value=available[selected].code;output.textContent='已恢复示例。';});
 run.addEventListener('click',()=>{
  cancelRun('已停止：重新运行');
  const token=Math.random().toString(36).slice(2),frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-scripts');frame.hidden=true;frame.title='代码执行沙箱';
  let timer;let done=false;let count=0;
  const stop=message=>{if(done)return;done=true;clearTimeout(timer);window.removeEventListener('message',onMessage);frame.remove();run.disabled=false;status.textContent=message;if(cancelActiveRun===stop)cancelActiveRun=null;};
  cancelActiveRun=stop;
  const onMessage=e=>{if(e.source!==frame.contentWindow||e.data?.token!==token)return;const d=e.data;if(d.type==='log'&&count<50000){const t=String(d.text).slice(0,50000-count);count+=t.length;output.textContent+=t+'\n';}if(d.type==='error'){output.textContent+='错误：'+String(d.text).slice(0,Math.max(0,50000-count))+'\n';stop('执行失败，请检查代码');}if(d.type==='done')stop('运行完成 · 本地执行');};
  window.addEventListener('message',onMessage);run.disabled=true;output.textContent='';status.textContent='正在运行…';
  const code=JSON.stringify(editor.value).replace(/</g,'\\u003c');
  // Bound traffic before it reaches the UI: a busy logging loop must not flood the parent.
  const workerSource=`onmessage = e => {
    let remaining=48000, lines=0, truncated=false;
    const send=postMessage.bind(self);
    const format=x=>{try {const value=typeof x==='string'?x:JSON.stringify(x,null,2);return String(value).slice(0,4000);}catch(_){return String(x).slice(0,4000);}};
    const log=(...xs)=>{
      if(remaining<=0||lines>=200){if(!truncated){truncated=true;send({type:'log',text:'[输出已截断：最多 200 行 / 48,000 字符]'});}return;}
      const text=xs.slice(0,20).map(format).join(' ').slice(0,remaining);
      remaining-=text.length+1;lines++;send({type:'log',text});
    };
    try {new Function('console',e.data)({log,warn:log,error:log,table:log});send({type:'done'});}
    catch(err){send({type:'error',text:String(err?.message??err).slice(0,4000)});}
  }`;
  frame.srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'"><script>
    let w, blobUrl; const token='${token}';
    const cleanup=()=>{if(w)w.terminate();if(blobUrl)URL.revokeObjectURL(blobUrl);};
    const send=data=>parent.postMessage({...data,token},'*');
    try {
      blobUrl=URL.createObjectURL(new Blob([${JSON.stringify(workerSource)}],{type:'text/javascript'}));
      w=new Worker(blobUrl);
      w.onmessage=e=>{send(e.data);if(e.data.type==='done'||e.data.type==='error')cleanup();};
      w.onerror=e=>{send({type:'error',text:String(e.message).slice(0,4000)});cleanup();};
      w.postMessage(${code});
    } catch(e) {send({type:'error',text:String(e.message).slice(0,4000)});cleanup();}
  </script>`;
  document.body.append(frame);timer=setTimeout(()=>stop('已停止：超过 3 秒运行限制'),3000);
 });
}
window.addEventListener('hashchange',()=>cancelRun('已停止：已离开实验'));
window.addEventListener('pagehide',()=>cancelRun('已停止：页面已关闭'));
document.addEventListener('course:render',mount);mount();
})();
