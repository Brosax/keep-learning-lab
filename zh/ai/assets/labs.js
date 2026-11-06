/* OpenSEEI original teaching simulations. All examples run locally. */
(() => {
  'use strict';
  const box = (title, intro, content) => `<section class="sim-box"><p class="eyebrow">INTERACTIVE LAB / 交互实验</p><h3>${title}</h3><p>${intro}</p>${content}</section>`;
  const label = (name,id,min,max,value,step=1)=>`<label for="${id}">${name} <output id="${id}-value">${value}</output></label><input id="${id}" type="range" min="${min}" max="${max}" value="${value}" step="${step}">`;
  const labs = {
    attention(el) {
      el.innerHTML=box('注意力不是平均分配','拨动温度，观察同一组分数如何变成概率。此处为 4 个 token 的单行教学示例。',label('温度 T','att-temp',0.1,3,1,0.1)+'<label><input id="att-mask" type="checkbox" checked> 因果遮罩：只能看到当前位置及之前</label><div id="att-bars"></div><p id="att-result" aria-live="polite"></p>');
      const render=()=>{const t=+el.querySelector('#att-temp').value,mask=el.querySelector('#att-mask').checked;el.querySelector('#att-temp-value').textContent=t.toFixed(1);const scores=[1,2,0.5,3], ex=scores.map((v,i)=>mask&&i===3?0:Math.exp((v-3)/t)), sum=ex.reduce((a,b)=>a+b,0),p=ex.map(v=>v/sum);el.querySelector('#att-bars').innerHTML=p.map((v,i)=>`<div class="sim-row"><span>${['我','正在','学习 ← 当前','模型'][i]}</span><span class="sim-bar" style="--bar:${v*100}%"></span><strong>${(v*100).toFixed(1)}%</strong></div>`).join('');el.querySelector('#att-result').textContent=`softmax(scores / T)；概率和 = ${p.reduce((a,b)=>a+b,0).toFixed(3)}。${mask?'未来 token 权重为 0，防止训练信息泄漏。':'遮罩关闭：未来 token 也能参与，这是自回归训练中的信息泄漏。'} 温度越低，分布越集中。`;};el.addEventListener('input',render);render();
    },
    scaling(el) {
      el.innerHTML=box('训练预算计算器','固定计算预算时，参数量和训练 token 数如何互相约束？这是 C ≈ 6ND 的稠密 Transformer 近似，不含数据、通信与硬件利用率开销。',label('参数量 N（十亿）','scale-n',1,70,7)+label('训练 token D（十亿）','scale-d',10,2000,140,10)+'<div class="sim-metrics" id="scale-result" aria-live="polite"></div><p>不能仅凭 6ND 判断哪个模型效果最好；需要用小规模实验拟合损失曲线，校验数据质量与分布。</p>');
      const render=()=>{let n=+el.querySelector('#scale-n').value,d=+el.querySelector('#scale-d').value;el.querySelector('#scale-n-value').textContent=n;el.querySelector('#scale-d-value').textContent=d;el.querySelector('#scale-result').innerHTML=`<div><strong>${(6*n*d/1000).toFixed(2)}</strong><span>训练计算量 / ZFLOP</span></div><div><strong>${(d/n).toFixed(1)}</strong><span>tokens / parameter</span></div><div><strong>${(2*n).toFixed(0)} GB</strong><span>仅 BF16 权重（十进制）</span></div>`;};el.addEventListener('input',render);render();
    },
    retrieval(el) {
      const docs=[['D1','模型的训练需要数据与计算预算'],['D2','工具调用需要参数校验与错误处理'],['D3','检索将文档片段加入模型的上下文'],['D4','评估需要独立测试集与明确成功标准'],['D5','数据去重可以减少训练集污染']];
      el.innerHTML=box('一次可见的检索过程','输入“模型 训练”或“工具 错误”，观察词项重合得分。本实验是词项匹配，不代表真实向量检索的质量。','<label for="retr-query">查询（用空格分词）</label><input id="retr-query" type="text" value="模型 训练" maxlength="100">'+label('Top-k','retr-k',1,5,2)+'<div id="retr-result" aria-live="polite"></div><p>思考：同义词没有字面重合时会发生什么？真实系统应比较 BM25、向量检索与 reranker，并在标注集上测量 Recall@k。</p>');
      const render=()=>{const terms=[...new Set(el.querySelector('#retr-query').value.trim().split(/\s+/).filter(Boolean))],k=+el.querySelector('#retr-k').value;el.querySelector('#retr-k-value').textContent=k;const sorted=docs.map(([id,text])=>({id,text,score:terms.filter(t=>text.includes(t)).length})).sort((a,b)=>b.score-a.score);const result=el.querySelector('#retr-result');result.replaceChildren();sorted.slice(0,k).forEach(d=>{const p=document.createElement('p');p.className='sim-doc';p.textContent=`${d.id} / 分数 ${d.score} — ${d.text}`;result.append(p);});if(!terms.length){result.textContent='请输入查询词。';}};el.addEventListener('input',render);render();
    },
    evaluation(el) {
      el.innerHTML=box('成功率，需要多少证据？','假设每次任务独立且成功标准固定。调整测试数量与成功比例，观察 95% Wilson 二项置信区间。',label('测试数量 n','eval-n',10,1000,100,10)+label('目标成功率（%）','eval-p',0,100,80)+'<div class="sim-metrics" id="eval-result" aria-live="polite"></div><p>样本相关、测试集泄漏、任务分布变化都可能让这个区间失去代表性。增加数量不能自动消除系统性偏差。</p>');
      const render=()=>{const n=+el.querySelector('#eval-n').value,w=+el.querySelector('#eval-p').value,s=Math.round(n*w/100),p=s/n,z=1.96,den=1+z*z/n,c=(p+z*z/(2*n))/den,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;el.querySelector('#eval-n-value').textContent=n;el.querySelector('#eval-p-value').textContent=w;el.querySelector('#eval-result').innerHTML=`<div><strong>${s} / ${n}</strong><span>成功 / 全部任务</span></div><div><strong>${(p*100).toFixed(1)}%</strong><span>样本成功率</span></div><div><strong>${((c-h)*100).toFixed(1)}–${((c+h)*100).toFixed(1)}%</strong><span>95% Wilson 区间</span></div>`;};el.addEventListener('input',render);render();
    }
  };
  window.CourseLabs={mount(root=document){root.querySelectorAll('[data-lab]').forEach(el=>{if(labs[el.dataset.lab]&&!el.dataset.mounted){el.dataset.mounted='true';labs[el.dataset.lab](el);}});}};
  document.addEventListener('course:render',()=>window.CourseLabs.mount());
  new MutationObserver(()=>window.CourseLabs.mount()).observe(document.getElementById('course-app'),{childList:true,subtree:true});
  window.CourseLabs.mount();
})();
