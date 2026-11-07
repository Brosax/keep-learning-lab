/* CS229 09–15: 12 perceptron mistake-bound code (notes6), 13 k-means code (notes7a), 14 EM visual (notes7b/notes8). Lessons 09–11 and 15 have no module. */
/* CS229 12: online perceptron and the Block–Novikoff mistake bound — cs229-notes6 p.1–3. */
(() => {
'use strict';
const C=window.COURSE_CODE ||= {};
C['cs229-12']={name:'在线感知机：数一数犯了几次错，与 (D/γ)² 比较',
 instructions:['先运行：看每次犯错时 θᵀu 与 kγ、‖θ‖² 与 kD² 的比较，它们就是讲义证明里的不等式 (3) 和 (5)。','把 data 的顺序打乱再运行：犯错次数可能变化，但始终不超过 (D/γ)²。','在 data 里加一个离分隔线很近的点，例如 { x: [1, -0.5], y: 1 }（uᵀx = 0.2），观察 γ 变小后界变成多少，实际犯错次数又变成多少。'],
 expected:'默认输出：D = √10 ≈ 3.162，γ = 1，界 (D/γ)² = 10；感知机总共犯 4 次错（第 1 遍 3 次、第 2 遍 1 次、第 3 遍 0 次），最终 θ = (3, 4)。每次犯错后 θᵀu 依次为 1、3、4、5（≥ kγ），‖θ‖² 依次为 5、10、20、25（≤ kD²）。',
 code:`// 讲义 cs229-notes6：标签 y ∈ {−1, 1}，h_θ(x) = g(θᵀx)，z ≥ 0 时 g(z) = 1。
// 补充：6 个二维样本是自设的；u = (0.6, 0.8) 是一个单位长度的分隔方向。
const data = [
  { x: [2, 1], y: 1 }, { x: [-1, 2], y: 1 }, { x: [1, -2], y: -1 },
  { x: [-2, -1], y: -1 }, { x: [3, -1], y: 1 }, { x: [-3, 1], y: -1 }
];
const u = [0.6, 0.8];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const D = Math.max(...data.map(d => Math.sqrt(dot(d.x, d.x))));
const gamma = +Math.min(...data.map(d => d.y * dot(u, d.x))).toFixed(6);   // 定理要求 y⁽ⁱ⁾uᵀx⁽ⁱ⁾ ≥ γ
console.log({ D: +D.toFixed(4), gamma, bound: +((D / gamma) ** 2).toFixed(4) });

let theta = [0, 0], k = 0;
const trace = [], perPass = [];
for (let pass = 0; pass < 100; pass++) {      // 在线地一遍遍扫过序列，直到一遍不错
  let mistakes = 0;
  for (const { x, y } of data) {
    const pred = dot(theta, x) >= 0 ? 1 : -1; // 先预测，再揭晓 y
    if (pred !== y) {                         // 只在犯错时更新：θ := θ + yx
      theta = [theta[0] + y * x[0], theta[1] + y * x[1]];
      k++; mistakes++;
      trace.push({ k, theta: theta.slice(), thetaU: +dot(theta, u).toFixed(4), kGamma: k * gamma,
                   normSq: dot(theta, theta), kD2: +(k * D * D).toFixed(4) });
    }
  }
  perPass.push(mistakes);
  if (mistakes === 0) break;
}
for (const row of trace) console.log(row);
console.log({ totalMistakes: k, perPass, finalTheta: theta, withinBound: k <= (D / gamma) ** 2 });
`};
})();
/* CS229 13: k-means as coordinate descent on the distortion J(c, μ) — cs229-notes7a p.1–3. */
(() => {
'use strict';
const C=window.COURSE_CODE ||= {};
C['cs229-13']={name:'k-means：失真函数 J 单调下降，但可能停在局部最优',
 instructions:['先运行：比较两组初始中心。每一轮打印“分配后”和“移动中心后”的 J，确认它从不上升。','把 runs 里第二组初始下标改成 [1, 6, 8] 或 [0, 2, 7]，看它们各自停在哪个 J。','按讲义的建议，从多组初始值运行，最后保留 J 最小的聚类：看 best 选中了哪一组。'],
 expected:'默认输出：初始中心取第 0、3、6 个样本时，J 依次为 6 → 4 → 4 → 4，收敛到三个簇，J = 4；取第 0、1、5 个样本时，J 依次为 166 → 100.6667 → 100.6667 → 100.6667，两个中心挤在左下角的簇里，另一个中心横跨两个簇。best 选中 J = 4 的那一组。',
 code:`// 讲义 cs229-notes7a。补充：9 个二维点是自设的，明显分成三团。
const X = [[0,0],[1,0],[0,1], [8,0],[9,0],[8,1], [4,7],[5,7],[4,8]];
const k = 3;
const sq = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
const distortion = (c, mu) => X.reduce((s, x, i) => s + sq(x, mu[c[i]]), 0); // J(c, μ)

function kmeans(initIndex) {
  // 讲义建议的初始化：随机选 k 个训练样本作为中心；这里为了可复现，直接给出下标。
  let mu = initIndex.map(i => X[i].slice());
  const history = [];
  for (let iter = 1; iter <= 50; iter++) {
    // (i) 固定 μ，对 c 最小化：每个点分给最近的中心
    const c = X.map(x => { let best = 0; for (let j = 1; j < k; j++) if (sq(x, mu[j]) < sq(x, mu[best])) best = j; return best; });
    const Jassign = distortion(c, mu);
    // (ii) 固定 c，对 μ 最小化：每个中心移到分给它的点的均值
    const next = mu.map((m, j) => { const pts = X.filter((_, i) => c[i] === j);
      return pts.length ? [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length] : m; });
    const Jupdate = distortion(c, next);
    history.push({ iter, Jassign: +Jassign.toFixed(4), Jupdate: +Jupdate.toFixed(4) });
    const moved = next.some((m, j) => sq(m, mu[j]) > 1e-12);
    mu = next;
    if (!moved) return { c, mu, history };
  }
}

const runs = [[0, 3, 6], [0, 1, 5]];
const results = runs.map(initIndex => ({ initIndex, ...kmeans(initIndex) }));
for (const r of results) {
  const J = r.history.map(h => [h.Jassign, h.Jupdate]).flat();
  console.log({ initIndex: r.initIndex, history: r.history, finalJ: J[J.length - 1],
    nonIncreasing: J.every((v, i) => i === 0 || v <= J[i - 1] + 1e-9),
    centroids: r.mu.map(m => m.map(v => +v.toFixed(4))), assignment: r.c });
}
const best = results.reduce((a, b) => (b.history.at(-1).Jupdate < a.history.at(-1).Jupdate ? b : a));
console.log({ best: best.initIndex, bestJ: best.history.at(-1).Jupdate });
`};
})();
/* CS229 14: EM for a mixture of Gaussians — cs229-notes7b p.1–3 (E-step / M-step) and cs229-notes8 p.5–8 (monotone likelihood, MoG revisited). */
(() => {
'use strict';
const {text,line,fmt}=window.MLVis;
const V=window.COURSE_VISUALS ||= {};
// 补充：8 个一维样本与初始参数是自设的；k = 2，每个成分有自己的方差 σⱼ²（讲义的 Σⱼ 在一维时就是 σⱼ²）。
const X=[-2,-1.5,-1,-.5,1.5,2,2.5,3.5],T=12;
const init={phi:[.5,.5],mu:[-.5,.5],v:[1,1]};
const dens=(x,m,v)=>Math.exp(-((x-m)**2)/(2*v))/Math.sqrt(2*Math.PI*v);
const loglik=p=>X.reduce((s,x)=>s+Math.log(p.phi[0]*dens(x,p.mu[0],p.v[0])+p.phi[1]*dens(x,p.mu[1],p.v[1])),0);
function eStep(p){return X.map(x=>{const a=p.phi[0]*dens(x,p.mu[0],p.v[0]),b=p.phi[1]*dens(x,p.mu[1],p.v[1]);return [a/(a+b),b/(a+b)];});}
function mStep(w){const out={phi:[],mu:[],v:[]};for(let j=0;j<2;j++){const N=w.reduce((s,r)=>s+r[j],0),m=w.reduce((s,r,i)=>s+r[j]*X[i],0)/N;out.phi.push(N/X.length);out.mu.push(m);out.v.push(w.reduce((s,r,i)=>s+r[j]*(X[i]-m)**2,0)/N);}return out;}
const path=[init];for(let t=0;t<T+1;t++)path.push(mStep(eStep(path[t])));
const LL=path.map(loglik);
const px=x=>40+(x+3.5)/8*680,py=y=>200-y*260;
const mix=(a,b,t)=>Math.round(a+(b-a)*t);
const color=w1=>`rgb(${mix(101,228,w1)},${mix(182,173,w1)},${mix(243,101,w1)})`; // w₁ = 1 → orange (component 1), w₁ = 0 → blue
function curve(p,j,cls){const pts=[];for(let k=0;k<=160;k++){const x=-3.5+k/20;pts.push(`${px(x).toFixed(1)},${Math.max(46,py(p.phi[j]*dens(x,p.mu[j],p.v[j]))).toFixed(1)}`);}return `<polyline points="${pts.join(' ')}" fill="none" stroke="${j===0?'#e4ad65':'#65b6f3'}" stroke-width="2.4" ${cls||''}/>`;}
V['cs229-14']={title:'高斯混合的 EM：E 步猜责任度，M 步重估参数，似然只升不降',param:'已完成的 EM 迭代次数 t',min:0,max:T,step:1,value:1,
 steps:['当前参数 θ⁽ᵗ⁾ 下的两个加权高斯','E 步：计算每个点的责任度 wⱼ⁽ⁱ⁾','M 步：用责任度加权重估 φ、μ、σ²','对数似然 ℓ(θ⁽ᵗ⁾) 随迭代单调不减'],
 render(step,t){
  t=Math.round(t);const p=path[t],w=eStep(p),next=path[t+1];
  let svg=text(24,28,`第 t = ${t} 次迭代后：橙色成分 1，蓝色成分 2（曲线为 φⱼ·N(x; μⱼ, σⱼ²)）`,'v-title');
  svg+=line(40,200,720,200,'v-axis');for(let x=-3;x<=4;x++)svg+=line(px(x),200,px(x),205,'v-axis')+text(px(x),219,String(x),'v-small v-center');
  const shown=step===2?next:p;svg+=curve(shown,0)+curve(shown,1);
  if(step===2)svg+=curve(p,0,'stroke-dasharray="5 5" opacity=".55"')+curve(p,1,'stroke-dasharray="5 5" opacity=".55"');
  X.forEach((x,i)=>{svg+=`<circle cx="${px(x).toFixed(1)}" cy="190" r="7" fill="${step>=1?color(w[i][0]):'#ffe38a'}" stroke="#0d1420" stroke-width="1.5"/>`;if(step===1)svg+=text(px(x),174-((i%2)*14),fmt(w[i][0],2),'v-small v-center');});
  if(step===3){const gx=k=>440+k/T*270,gy=l=>306-(l+22)/9*72;svg+=line(440,306,710,306,'v-axis')+line(440,232,440,306,'v-axis')+text(446,244,'ℓ(θ)','v-small')+text(575,323,'迭代 t','v-small v-center');
   svg+=`<polyline points="${LL.slice(0,T+1).map((l,k)=>`${gx(k).toFixed(1)},${gy(l).toFixed(1)}`).join(' ')}" class="v-teal"/>`+`<circle cx="${gx(t).toFixed(1)}" cy="${gy(LL[t]).toFixed(1)}" r="5" class="v-dot"/>`;}
  svg+=text(40,250,`φ = (${fmt(shown.phi[0],3)}, ${fmt(shown.phi[1],3)})`,'v-small')+text(40,272,`μ = (${fmt(shown.mu[0],3)}, ${fmt(shown.mu[1],3)})`,'v-small')+text(40,294,`σ² = (${fmt(shown.v[0],3)}, ${fmt(shown.v[1],3)})`,'v-small')+text(40,316,`ℓ = ${fmt(loglik(shown),4)}`,'v-small');
  const N1=w.reduce((s,r)=>s+r[0],0);
  const bodies=[
   `讲义 7b 的模型：z⁽ⁱ⁾ ~ Multinomial(φ)，x⁽ⁱ⁾ | z⁽ⁱ⁾ = j ~ N(μⱼ, Σⱼ)。z⁽ⁱ⁾ 是看不见的潜变量，所以没法像 GDA 那样直接数。图中是 ${t} 次 EM 迭代后的参数，黄点是 8 个样本。${t===0?'初始的两个均值都在 0 附近，还没有分开。':''}`,
   `E 步对每个 i、j 计算 wⱼ⁽ⁱ⁾ := p(z⁽ⁱ⁾ = j | x⁽ⁱ⁾; φ, μ, Σ)，即用贝叶斯公式求后验（7b p.3）。点的颜色和数字是成分 1 的责任度 w₁⁽ⁱ⁾：越橙越属于成分 1。这是“软”猜测，取值在 [0, 1]，而 k-means 的 c⁽ⁱ⁾ 是“硬”分配。当前成分 1 的有效样本数 Σᵢ w₁⁽ⁱ⁾ = ${fmt(N1,3)}。`,
   `M 步把指示函数 1{z⁽ⁱ⁾ = j} 换成 wⱼ⁽ⁱ⁾，按 GDA 的公式重估：φⱼ = (1/m)Σᵢ wⱼ⁽ⁱ⁾，μⱼ 是以 wⱼ⁽ⁱ⁾ 加权的均值，σⱼ² 是加权方差（8 p.7–8）。虚线是更新前，实线是更新后：μ 从 (${fmt(p.mu[0],3)}, ${fmt(p.mu[1],3)}) 变为 (${fmt(next.mu[0],3)}, ${fmt(next.mu[1],3)})。`,
   `讲义 8 证明 ℓ(θ⁽ᵗ⁾) ≤ ℓ(θ⁽ᵗ⁺¹⁾)：E 步选的 Qᵢ 让下界在 θ⁽ᵗ⁾ 处取等号，M 步再最大化这个下界。曲线是 t = 0…${T} 的 ℓ，单调不减，约 6 次迭代后基本不再变化，收敛到 ${fmt(LL[T],4)}。和 k-means 一样，EM 也可能停在局部最优，换几组初始值再比较 ℓ 是常见做法。`];
  return {svg,metrics:{t,phi:p.phi,mu:p.mu,v:p.v,w1:w.map(r=>r[0]),loglik:LL[t],next:{phi:next.phi,mu:next.mu,v:next.v},loglikPath:LL.slice(0,T+1)},
   formula:'E 步：wⱼ⁽ⁱ⁾ = φⱼN(x⁽ⁱ⁾; μⱼ, σⱼ²) / Σₗ φₗN(x⁽ⁱ⁾; μₗ, σₗ²)；M 步：φⱼ = (1/m)Σᵢwⱼ⁽ⁱ⁾，μⱼ = Σᵢwⱼ⁽ⁱ⁾x⁽ⁱ⁾ / Σᵢwⱼ⁽ⁱ⁾，σⱼ² = Σᵢwⱼ⁽ⁱ⁾(x⁽ⁱ⁾ − μⱼ)² / Σᵢwⱼ⁽ⁱ⁾',
   body:bodies[step],result:`t = ${t} · ℓ(θ⁽ᵗ⁾) = ${fmt(LL[t],4)} · μ = (${fmt(p.mu[0],3)}, ${fmt(p.mu[1],3)})`,
   note:'补充：讲义没有给出数值例子；8 个样本、初始参数 φ = (0.5, 0.5)、μ = (−0.5, 0.5)、σ² = (1, 1) 都是自设的。ℓ 用自然对数。'};
 }};
})();
