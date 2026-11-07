/* CME295 01–03: only Lecture 2 (2026) needs an interactive diagram — temperature and top-p sampling (p.107–114). */
(() => {
'use strict';
const {text,rect,fmt,softmax}=window.MLVis;
const V=window.COURSE_VISUALS ||= {};
const title=s=>text(24,28,s,'v-title');

// 补充数字：讲义 p.107–114 的图没有给数值；这四个概率与 p=0.8 取自 2026 期中 II.5。
const baseProb=[.6,.25,.1,.05],topP=.8,topK=2;
function sampling(temperature){
 const distribution=softmax(baseProb.map(p=>Math.log(p)/temperature));
 const order=distribution.map((p,i)=>({p,i})).sort((a,b)=>b.p-a.p||a.i-b.i);
 let mass=0;const topPIndices=[];
 for(const item of order){topPIndices.push(item.i);mass+=item.p;if(mass+1e-12>=topP)break;}
 const normalize=indices=>{const total=indices.reduce((s,i)=>s+distribution[i],0);return distribution.map((p,i)=>indices.includes(i)?p/total:0);};
 return {distribution,topPIndices,retainedMass:mass,topPDistribution:normalize(topPIndices),topKDistribution:normalize(order.slice(0,topK).map(item=>item.i)),entropy:-distribution.reduce((s,p)=>s+p*Math.log(p),0)};
}
V['cme295-02']={title:'温度与 top-p：同一组 logits，保留几个候选？',param:'温度 T',min:.5,max:2,step:.25,value:1,
 steps:['Probability computation：logits 经 softmax 得到概率','Temperature：logits 除以 T 再 softmax','Top-p：取累计概率 ≥ p 的最小集合','重新归一化，并与 top-k（k=2）对比'],
 render(step,T){
  const m=sampling(T);let svg=title('四个候选 A–D；补充数字：概率 [0.60, 0.25, 0.10, 0.05]，p = 0.8');
  const row=(y,label,values,dimDropped=false)=>{let out=text(24,y+18,label,'v-small');values.forEach((p,i)=>{const x=220+i*125;const dropped=dimDropped&&!m.topPIndices.includes(i);out+=rect(x,y,105,22,'v-node',3)+`<rect x="${x}" y="${y}" width="${105*p}" height="22" rx="3" fill="${dropped?'#53657d':'#50dfc2'}"/>`+text(x+52,y+43,`${'ABCD'[i]} ${fmt(p,3)}`,'v-center v-small');});return out;};
  svg+=row(66,step===0?'T = 1 的概率':`T = ${fmt(T,2)} 的概率`,step===0?baseProb:m.distribution,step>=2);
  if(step>=2)svg+=text(25,157,`top-p 保留 ${m.topPIndices.map(i=>'ABCD'[i]).join('、')}：累计概率 ${fmt(m.retainedMass,4)} ≥ 0.8`);
  if(step>=3)svg+=row(182,'top-p 重新归一化',m.topPDistribution,true)+row(260,'top-k（k=2）',m.topKDistribution);
  const bodies=[
   '最后一层 Linear 输出 logits，softmax 把它们变成下一个 token 的概率分布（讲义 p.110–111）。这里把 logits 取为概率的自然对数，所以 T = 1 时 softmax 正好还原 [0.60, 0.25, 0.10, 0.05]。',
   `温度 T 先除 logits 再做 softmax（p.112）：T 小，分布变尖；T 大，分布变平（p.113–114）。当前 T = ${fmt(T,2)}，概率变为 [${m.distribution.map(p=>fmt(p,4)).join(', ')}]。候选的排序不变，变的是概率的集中程度。`,
   `top-p 从概率最高的候选开始累加，取累计概率首次达到 p 的最小集合（p.108）。当前保留 ${m.topPIndices.length} 个候选，累计 ${fmt(m.retainedMass,4)}。T = 0.5 时 A 一个就超过 0.8；T ≥ 1.25 时要 A、B、C 三个才够。`,
   `保留的候选除以累计概率，其余置 0，得到 [${m.topPDistribution.map(p=>fmt(p,4)).join(', ')}]，再从中随机采样。top-k（p.107）无论温度如何都固定保留 k = 2 个，所以它和 top-p 只在部分温度下保留同样的集合。`];
  return {svg,metrics:m,formula:'p_i(T) = softmax(z / T)_i；top-p：累计概率 ≥ p 的最小集合 S；p̃_i = p_i / Σ_{j∈S} p_j',body:bodies[step],
   result:`top-p 保留 ${m.topPIndices.length} 个 · top-k 保留 2 个 · 熵 ${fmt(m.entropy,4)} nats`,
   note:'补充：讲义 p.107–114 的图只有示意，没有数值；这里的四个概率和 p = 0.8 取自 2026 期中 II.5。实现约定为先调温度、再截断、再重新归一化；累计达到阈值即停止（容差 1e−12）。'};
 }};
})();
