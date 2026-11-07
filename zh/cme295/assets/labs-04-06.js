/* CME295 04–06: Lecture 4 (2026) baseline toy example (p.34–36) and Lecture 5 (2026) online softmax (p.30–47). Lecture 6 has no module. */
(() => {
'use strict';
const {text,line,rect,fmt}=window.MLVis;
const V=window.COURSE_VISUALS ||= {},C=window.COURSE_CODE ||= {};
const title=s=>text(24,28,s,'v-title');

// Lecture 4 p.36: π_θ(good)=σ(θ)=0.5，R(good)=101，R(bad)=100，g=(R(y)−b)∇_θ log π_θ(y)。
function baseline(b){
 const reward={good:101,bad:100},gradLog={good:.5,bad:-.5},prob={good:.5,bad:.5};
 const advantage={good:reward.good-b,bad:reward.bad-b};
 const gGood=advantage.good*gradLog.good,gBad=advantage.bad*gradLog.bad;
 const mean=prob.good*gGood+prob.bad*gBad;
 const variance=prob.good*(gGood-mean)**2+prob.bad*(gBad-mean)**2;
 return {baseline:b,goodMinusBaseline:advantage.good,badMinusBaseline:advantage.bad,gGood,gBad,mean,variance,sameSign:gGood*gBad>0};
}
V['cme295-04']={title:'基线 b：期望梯度不变，方差随 b 改变',param:'基线 b',min:0,max:101,step:.5,value:0,
 steps:['玩具设定：σ(θ) = 0.5，R(good) = 101，R(bad) = 100','减去基线：R(y) − b','乘上 ∇_θ log π_θ(y)，得到两个样本的 g','比较 E[g] 与 Var[g]'],
 render(step,b){
  const m=baseline(b);let svg=title('Lecture 4 玩具例子：一个参数 θ，两个回答');
  const zero=300,scale=200/101;
  svg+=line(60,zero,360,zero,'v-axis')+text(14,200,'Reward','v-small');
  [['good',110,101,'Good answer'],['bad',240,100,'Bad answer']].forEach(([key,x,r,label])=>{
   svg+=`<rect x="${x}" y="${zero-r*scale}" width="60" height="${r*scale}" rx="3" fill="#7aa2f7"/>`+text(x+30,zero-r*scale-8,String(r),'v-center v-small')+text(x+30,zero+20,label,'v-center v-small');
   if(step>=1)svg+=text(x+30,zero-r*scale-26,`R−b = ${fmt(key==='good'?m.goodMinusBaseline:m.badMinusBaseline,2)}`,'v-center v-small');
  });
  if(step>=1){const y=zero-b*scale;svg+=line(70,y,350,y,'v-edge')+text(352,y+4,`b = ${fmt(b,1)}`,'v-small');}
  if(step>=2){
   const mid=190,maxAbs=Math.max(Math.abs(m.gGood),Math.abs(m.gBad),.25),h=g=>g/maxAbs*100;
   svg+=line(420,mid,740,mid,'v-axis')+text(420,66,'g（柱长按当前最大值缩放）','v-small');
   [['g_good',490,m.gGood],['g_bad',630,m.gBad]].forEach(([label,x,g])=>{
    const height=Math.abs(h(g)),y=g>=0?mid-height:mid;
    svg+=`<rect x="${x}" y="${y}" width="60" height="${height}" rx="3" fill="${g>=0?'#50dfc2':'#f28b82'}"/>`+text(x+30,g>=0?y-8:y+height+18,`${label} = ${fmt(g,3)}`,'v-center v-small');
   });
  }
  if(step>=3)svg+=text(580,46,`E[g] = ${fmt(m.mean,4)}　Var[g] = ${fmt(m.variance,4)}`,'v-center v-small');
  const bodies=[
   '讲义 p.36 的设定：只有一个参数 θ，π_θ(good) = σ(θ) = 0.5，π_θ(bad) = 0.5；好回答奖励 101，坏回答奖励 100（p.34）。两个奖励都很大、差别却很小，这正是梯度噪声的来源。',
   `基线 b 是一个比较的参照（p.35）。当前 b = ${fmt(b,1)}：好回答 R − b = ${fmt(m.goodMinusBaseline,2)}，坏回答 R − b = ${fmt(m.badMinusBaseline,2)}。讲义取 b = 100.5，两者变成 +0.5 和 −0.5。`,
   `∇_θ log π_θ(good) = +0.5，∇_θ log π_θ(bad) = −0.5，所以 g_good = ${fmt(m.gGood,3)}，g_bad = ${fmt(m.gBad,3)}。b = 0 时就是讲义的 +50.5 和 −50；b = 100.5 时两者都是 +0.25。b 越过 100 时 g_bad 变号：此后两个样本把 θ 往同一个方向推。`,
   `两个回答各以 0.5 的概率被采到。补充计算：E[g] = ${fmt(m.mean,4)}，任何 b 都是 0.25；Var[g] = ${fmt(m.variance,4)}，b = 100.5 时为 0。基线不改变梯度的期望，只改变它的方差，这就是讲义说的 lower-variance gradients。`];
  return {svg,metrics:m,formula:'g = (R(y) − b) ∇_θ log π_θ(y)；E[g] = ½g_good + ½g_bad；Var[g] = ½(g_good − E[g])² + ½(g_bad − E[g])²',body:bodies[step],
   result:`g_good = ${fmt(m.gGood,3)} · g_bad = ${fmt(m.gBad,3)} · E[g] = ${fmt(m.mean,3)} · Var[g] = ${fmt(m.variance,4)}`,
   note:'讲义只给了 b = 0 与 b = 100.5 两个点（p.36）；期望和方差是补充计算。方差在这个两样本例子里能降到 0，一般情况下基线只会让方差变小。'};
 }};

C['cme295-05']={name:'在线 softmax：为什么要维护运行最大值',
 instructions:['先运行默认的 s = [1001, 1003, 1002]：不减最大值的写法 Math.exp(1001) 溢出成 Infinity，naiveOverflow 为 true；在线版本给出 21.5470。','把 s 改成 [1, 3, 2]：不再溢出，两种写法结果相同，因为所有分数同加一个常数不改变 softmax。','把 s 改成 [1001, 1003, 1005]：第 3 步最大值又变了，α 变成 e^{−2} ≈ 0.1353，输出变成 28.5094。再把 v 改成 [1, 1, 1]，输出应为 1。'],
 expected:'默认：naiveOverflow = true；online ≈ 21.54697897884417；trace 第 2 步 m = 1003、α ≈ 0.1353、N ≈ 21.3534、D ≈ 1.1353，第 3 步 α = 1、N ≈ 32.3897、D ≈ 1.5032。',
 code:`const s = [1001, 1003, 1002]; // 一行注意力分数 s_1, s_2, s_3（讲义 p.30）
const v = [10, 20, 30];       // 对应的 v_1, v_2, v_3（这里取标量）

// ① 不减最大值的增量计算（p.33–38）：N = Σ e^{s_i} v_i，D = Σ e^{s_i}
let N0 = 0, D0 = 0;
for (let i = 0; i < s.length; i++) {
  N0 += Math.exp(s[i]) * v[i];
  D0 += Math.exp(s[i]);
}

// ② 在线 softmax（p.46–47）：m_{t+1} = max(m_t, s_{t+1})，α_t = e^{m_t − m_{t+1}}
let m = -Infinity, N = 0, D = 0;
const trace = [];
for (let i = 0; i < s.length; i++) {
  const mNew = Math.max(m, s[i]);
  const alpha = Math.exp(m - mNew); // 第一步 m = −∞，α = 0：之前还没有累积量
  const w = Math.exp(s[i] - mNew);
  N = alpha * N + w * v[i];
  D = alpha * D + w;
  m = mNew;
  trace.push({ t: i + 1, m, alpha: +alpha.toFixed(4), N: +N.toFixed(4), D: +D.toFixed(4) });
}
console.log({ naiveOverflow: !Number.isFinite(D0), online: N / D, trace });`};
})();
