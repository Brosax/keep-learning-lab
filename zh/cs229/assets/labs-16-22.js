/* CS229 16–22: 16 PCA projection visual (notes10), 18 value/policy iteration code (notes12 §1–2). Lessons 17 and 19–22 have no module. */
/* CS229 16: PCA as the unit direction u that maximises the variance of the projections — cs229-notes10 p.2–5. */
(() => {
'use strict';
const {text,line,point,fmt}=window.MLVis;
const V=window.COURSE_VISUALS ||= {};
// 补充：8 位遥控直升机飞手的自设数据，x₁ = 驾驶技术（0–10 分），x₂ = 喜爱程度（1–5 分），对应讲义 p.1–2 的例子。
const raw=[[2,1.5],[3,2.6],[4,2],[5,3.2],[6,2.5],[7,3.9],[8,3.3],[9,4.3]],m=raw.length;
// 讲义 p.2 的预处理 (1)–(4)：减去均值，再把每个坐标除以标准差。
const mean=[0,1].map(j=>raw.reduce((s,r)=>s+r[j],0)/m),sd=[0,1].map(j=>Math.sqrt(raw.reduce((s,r)=>s+(r[j]-mean[j])**2,0)/m));
const Z=raw.map(r=>[(r[0]-mean[0])/sd[0],(r[1]-mean[1])/sd[1]]);
const S=[[0,0],[0,0]];for(const z of Z)for(let a=0;a<2;a++)for(let b=0;b<2;b++)S[a][b]+=z[a]*z[b]/m;
const eig=(()=>{const tr=S[0][0]+S[1][1],det=S[0][0]*S[1][1]-S[0][1]*S[1][0],r=Math.sqrt(tr*tr/4-det);return [tr/2+r,tr/2-r];})();
const principalDeg=((Math.atan2(eig[0]-S[0][0],S[0][1])*180/Math.PI)+180)%180;
const unit=deg=>[Math.cos(deg*Math.PI/180),Math.sin(deg*Math.PI/180)];
const projVar=u=>Z.reduce((s,z)=>s+(z[0]*u[0]+z[1]*u[1])**2,0)/m;
const px=v=>205+v*62,py=v=>185-v*62; // equal scale so projections look perpendicular
V['cs229-16']={title:'PCA：转动单位向量 u，让投影的方差最大',param:'u 的方向（度）',min:0,max:180,step:5,value:0,
 steps:['预处理：减均值、每个坐标除以标准差','把每个点投影到 u 上：投影长度 x⁽ⁱ⁾ᵀu','投影的方差 (1/m)Σ(x⁽ⁱ⁾ᵀu)² = uᵀΣu','所有方向中，方差最大的是 Σ 的主特征向量'],
 render(step,deg){
  const u=unit(deg),v=projVar(u),total=eig[0]+eig[1],resid=total-v;
  let svg=text(24,28,`归一化后的 8 个点；u 方向 ${fmt(deg,0)}°`,'v-title');
  svg+=line(40,185,370,185,'v-axis')+line(205,48,205,322,'v-axis')+text(366,200,'x₁','v-small v-end')+text(212,60,'x₂','v-small');
  if(step>=1)svg+=`<line x1="${px(-2.1*u[0]).toFixed(1)}" y1="${py(-2.1*u[1]).toFixed(1)}" x2="${px(2.1*u[0]).toFixed(1)}" y2="${py(2.1*u[1]).toFixed(1)}" class="v-yellow"/>`;
  Z.forEach(z=>{const t=z[0]*u[0]+z[1]*u[1];if(step>=1)svg+=line(px(z[0]),py(z[1]),px(t*u[0]),py(t*u[1]),'v-edge')+`<circle cx="${px(t*u[0]).toFixed(1)}" cy="${py(t*u[1]).toFixed(1)}" r="5" fill="none" stroke="#50dfc2" stroke-width="2"/>`;svg+=point(px(z[0]),py(z[1]),4);});
  if(step===0){svg+=text(420,80,'原始均值 μ = ('+fmt(mean[0],3)+', '+fmt(mean[1],3)+')','v-small')+text(420,106,'原始标准差 σ = ('+fmt(sd[0],3)+', '+fmt(sd[1],3)+')','v-small')+text(420,140,'归一化后的协方差 Σ = (1/m)Σx⁽ⁱ⁾x⁽ⁱ⁾ᵀ：','v-small')+text(440,166,`[[${fmt(S[0][0],3)}, ${fmt(S[0][1],3)}], [${fmt(S[1][0],3)}, ${fmt(S[1][1],3)}]]`,'v-small');}
  if(step===1||step===2){svg+=text(420,80,'投影长度 x⁽ⁱ⁾ᵀu：','v-small');Z.forEach((z,i)=>{svg+=text(420+(i%2)*150,106+Math.floor(i/2)*24,`#${i+1}: ${fmt(z[0]*u[0]+z[1]*u[1],3)}`,'v-small');});
   if(step===2){const bx=420,by=226;svg+=text(bx,by,`投影方差 uᵀΣu = ${fmt(v,4)}`,'v-small')+`<rect x="${bx}" y="${by+8}" width="${(v/total*300).toFixed(1)}" height="14" rx="2" fill="#50dfc2"/>`+text(bx,by+44,`丢掉的部分 = ${fmt(resid,4)}（总方差 ${fmt(total,1)}）`,'v-small')+`<rect x="${bx}" y="${by+52}" width="${(resid/total*300).toFixed(1)}" height="14" rx="2" fill="#53657d"/>`;}}
  if(step===3){const gx=d=>420+d/180*300,gy=val=>300-val/2*220;svg+=line(420,300,720,300,'v-axis')+line(420,70,420,300,'v-axis')+text(570,318,'u 的方向（度）','v-small v-center')+text(426,82,'uᵀΣu','v-small');
   const pts=[];for(let d=0;d<=180;d+=2.5)pts.push(`${gx(d).toFixed(1)},${gy(projVar(unit(d))).toFixed(1)}`);svg+=`<polyline points="${pts.join(' ')}" class="v-teal"/>`;
   svg+=point(gx(principalDeg),gy(eig[0]),6,'v-history')+point(gx(deg),gy(v),5)+text(gx(principalDeg)+8,gy(eig[0])-8,`λ₁ = ${fmt(eig[0],3)}`,'v-small');}
  const bodies=[
   `讲义 p.2 先做预处理：(1)(2) 减去均值，(3)(4) 每个坐标除以标准差，让“技术分（0–10）”和“喜爱程度（1–5）”处于同一尺度。之后协方差 Σ 就是相关系数矩阵，对角元都为 1，非对角元 ${fmt(S[0][1],3)} 说明两个属性强相关。`,
   `给定单位向量 u，点 x⁽ⁱ⁾ 投影到 u 上的长度是 x⁽ⁱ⁾ᵀu（p.5），绿色圆圈是投影点。讲义 p.3–4 的两幅图对比：一个方向上投影仍然分得很开、离原点远，另一个方向上投影挤在原点附近。当前 ${fmt(deg,0)}°。`,
   `投影的方差是 (1/m)Σ(x⁽ⁱ⁾ᵀu)² = uᵀ((1/m)Σx⁽ⁱ⁾x⁽ⁱ⁾ᵀ)u = uᵀΣu = ${fmt(v,4)}。因为 ‖x⁽ⁱ⁾‖² = (x⁽ⁱ⁾ᵀu)² + 到直线的距离²，投影保留的方差加上丢掉的部分（平均重建误差）总是等于总方差 tr Σ = ${fmt(total,1)}：保留得越多，重建误差越小。`,
   `在 ‖u‖ = 1 的约束下最大化 uᵀΣu，用拉格朗日乘子得到 Σu = λu（p.5 脚注），最大值是最大特征值 λ₁ = ${fmt(eig[0],4)}，在 ${fmt(principalDeg,0)}° 取得；最小特征值 λ₂ = ${fmt(eig[1],4)} 在与之垂直的方向。当前方向的 uᵀΣu = ${fmt(v,4)}。补充：二维数据归一化后，Σ 的特征向量总在 45° 和 135°，这里正是如此。`];
  return {svg,metrics:{deg,projectedVariance:v,residual:resid,lambda:eig,principalDeg,Sigma:S,mean,sd},
   formula:'max_{‖u‖=1} (1/m)Σᵢ(x⁽ⁱ⁾ᵀu)² = uᵀΣu，Σ = (1/m)Σᵢ x⁽ⁱ⁾x⁽ⁱ⁾ᵀ；最优 u 满足 Σu = λ₁u',
   body:bodies[step],result:`${fmt(deg,0)}° · uᵀΣu = ${fmt(v,4)} · λ₁ = ${fmt(eig[0],4)}（${fmt(principalDeg,0)}°）`,
   note:'补充：8 个数据点是自设的，讲义的图没有给出坐标。标准差按 1/m 计算，与讲义预处理步骤 (3) 一致。'};
 }};
})();
/* CS229 18: value iteration (synchronous / asynchronous) and policy iteration on a finite MDP — cs229-notes12 p.2–6. */
(() => {
'use strict';
const C=window.COURSE_CODE ||= {};
C['cs229-18']={name:'价值迭代与策略迭代：同一个 MDP，三种算法得到同一个 V* 和 π*',
 instructions:['先运行：比较同步价值迭代、异步价值迭代和策略迭代得到的 V* 与最优策略，以及各自用了几轮。','把 gamma 改成 0.3 再运行：远处的大奖励被折扣得太厉害，状态 2 的最优动作变成向左去拿小奖励。','把异步更新的循环改回从左往右（s = 0 到 S − 1），比较它和同步更新的轮数；再把 slip 改成 0.5，观察 V* 怎样变小。'],
 expected:'默认 γ = 0.9：三种算法都得到 V* ≈ [1, 6.7695, 7.7097, 8.7805, 10, 0]，最优策略在状态 2、3、4 都是 →。同步价值迭代 22 轮收敛（阈值 1e−10），从右往左扫的异步价值迭代轮数更少，因为状态 4 的新值在同一轮里就传给了状态 3、2、1；策略迭代从“全部向左”出发，策略依次为 ←←←、←←→、←→→、→→→，第 4 次评估后不再改变。',
 code:`// 讲义 cs229-notes12 §1–2，状态奖励 R(s)。补充：这个 6 状态的走廊 MDP 是自设的。
// 状态 0..4 排成一行，0 号奖励 1，4 号奖励 10；进入 0 或 4 后下一步到终止状态 5（奖励 0，之后停在 5）。
// 在 1、2、3 号状态可以选 ←（a = 0）或 →（a = 1）：以 1 − slip 的概率走到相邻格，以 slip 的概率原地不动。
const gamma = 0.9, slip = 0.2;
const R = [1, 0, 0, 0, 10, 0], S = R.length, A = [0, 1];
function P(s, a) {                       // P_sa：返回 [下一状态, 概率] 的列表
  if (s === 0 || s === 4 || s === 5) return [[5, 1]];
  return [[a === 0 ? s - 1 : s + 1, 1 - slip], [s, slip]];
}
const backup = (V, s, a) => P(s, a).reduce((sum, [t, p]) => sum + p * V[t], 0);
const bellman = (V, s) => R[s] + gamma * Math.max(...A.map(a => backup(V, s, a)));
const round = V => V.map(v => +v.toFixed(4));

// 价值迭代：同步更新（先算出所有新值再整体覆盖）
let V = new Array(S).fill(0), syncIters = 0;
for (;;) { const next = V.map((_, s) => bellman(V, s)); syncIters++;
  const delta = Math.max(...next.map((v, s) => Math.abs(v - V[s]))); V = next; if (delta < 1e-10) break; }
const Vsync = V;
// 价值迭代：异步更新（按某种顺序逐个状态更新，立即使用新值；这里从右往左扫）
V = new Array(S).fill(0); let asyncIters = 0;
for (;;) { let delta = 0; asyncIters++;
  for (let s = S - 1; s >= 0; s--) { const v = bellman(V, s); delta = Math.max(delta, Math.abs(v - V[s])); V[s] = v; }
  if (delta < 1e-10) break; }
const Vasync = V;

// 策略迭代：(a) 解 |S| 个线性方程得到 V^π；(b) 取对 V^π 贪心的策略
function evaluate(pi) {                  // 高斯消元解 (I − γP_π)V = R
  const M = R.map((r, s) => { const row = new Array(S).fill(0); row[s] = 1;
    for (const [t, p] of P(s, pi[s])) row[t] -= gamma * p; return [...row, r]; });
  for (let c = 0; c < S; c++) { const piv = M.findIndex((row, r) => r >= c && Math.abs(row[c]) > 1e-12);
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < S; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= S; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((row, s) => row[S] / row[s]);
}
const greedy = V => V.map((_, s) => (backup(V, s, 1) > backup(V, s, 0) + 1e-12 ? 1 : 0));
let pi = new Array(S).fill(0), piIters = 0, Vpi;
const history = [];
for (;;) { Vpi = evaluate(pi); const next = greedy(Vpi); piIters++;
  history.push(pi.slice(1, 4).map(a => (a ? '→' : '←')).join(''));
  if (next.every((a, s) => a === pi[s])) break; pi = next; }

const arrows = p => p.slice(1, 4).map(a => (a ? '→' : '←'));
console.log({ gamma, slip, Vsync: round(Vsync), syncIters, Vasync: round(Vasync), asyncIters });
console.log({ Vpi: round(Vpi), piIters, policyHistory: history, optimalPolicy: arrows(greedy(Vsync)),
  maxGap: Math.max(...Vsync.map((v, s) => Math.abs(v - Vpi[s]))) });
`};
})();
