/* CS230 01–06: only three lessons need modules.
 * 03 code — two-layer backprop (C1M3 p.28) + gradient checking (C2M1 p.33–40).
 * 04 visual — learning rate and momentum on an elongated bowl (C2M2 p.19–20); 04 code — momentum / RMSprop / Adam (C2M2 p.20–25).
 * 05 visual — vanishing/exploding activations in a deep linear network (C2M1 p.30–32).
 * Lessons 01, 02 and 06 are text, tables and worked examples only. */
(() => {
'use strict';
const {text,line,rect,point,fmt}=window.MLVis;
const V=window.COURSE_VISUALS ||= {},C=window.COURSE_CODE ||= {};
const title=s=>text(24,28,s,'v-title');

// ---------- 03 · code: forward/backward of a 2-layer network, then gradient checking ----------
C['cs230-03']={name:'两层网络的反向传播与梯度检查',
 instructions:[
  '先读 backward()：六行公式与 C1M3 p.28 一一对应，确认每个 dW、db 与 W、b 同形。',
  '把 bug 改成 "dropDerivative"（漏乘 g′(Z1) = 1 − A1²）或 "dropMean"（dW1 漏除以 m），看相对误差变成什么量级、差得最多的是哪个参数。',
  '把 eps 改成 1e-2、1e-4，比较正确实现的相对误差；对照 C2M1 p.35，双边差分的误差是 O(ε²)。'],
 expected:'正确实现：代价约 0.6966，相对误差约 2e−9（小于 1e−7，“很好”）。漏乘 g′(Z1) 时相对误差约 0.16，漏除以 m 时约 0.43，都远超 1e−3，差得最多的分量都在 W1。ε = 1e−2 时正确实现的相对误差升到约 3e−5。',
 code:`// 补充数字：2 个特征、m = 3 个样本，一列一个样本（C1M2 p.4 的约定）；隐藏层 3 个 tanh 单元，输出层 sigmoid。
const X = [[1, 2, -1], [0.5, -1, 2]];   // (n_x = 2, m = 3)
const Y = [[1, 0, 1]];                  // (1, m)
const init = {
  W1: [[0.1, -0.2], [0.4, 0.3], [-0.5, 0.2]], b1: [[0], [0.1], [-0.1]],   // (3, 2), (3, 1)
  W2: [[0.3, -0.6, 0.5]], b2: [[0.05]]                                      // (1, 3), (1, 1)
};
const bug = 'none';   // 试试 'dropDerivative' 或 'dropMean'
const eps = 1e-7;     // C2M1 p.38 建议的 ε

const m = X[0].length;
const matmul = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
const T = A => A[0].map((_, j) => A.map(row => row[j]));
const addBias = (A, b) => A.map((row, i) => row.map(v => v + b[i][0]));   // 广播：b 加到每一列
const each = (A, f) => A.map(row => row.map(f));
const pair = (A, B, f) => A.map((row, i) => row.map((v, j) => f(v, B[i][j])));
const sumRows = A => A.map(row => [row.reduce((s, v) => s + v, 0)]);      // np.sum(axis=1, keepdims=True)
const sigmoid = z => 1 / (1 + Math.exp(-z));

function forward(p) {
  const Z1 = addBias(matmul(p.W1, X), p.b1), A1 = each(Z1, Math.tanh);
  const Z2 = addBias(matmul(p.W2, A1), p.b2), A2 = each(Z2, sigmoid);
  const cost = -A2[0].reduce((s, a, i) => s + Y[0][i] * Math.log(a) + (1 - Y[0][i]) * Math.log(1 - a), 0) / m;
  return {A1, A2, cost};
}
function backward(p) {
  const {A1, A2} = forward(p);
  const dZ2 = pair(A2, Y, (a, y) => a - y);                                  // dZ2 = A2 − Y
  const dW2 = each(matmul(dZ2, T(A1)), v => v / m);                          // dW2 = (1/m) dZ2 A1ᵀ
  const db2 = each(sumRows(dZ2), v => v / m);
  const upstream = matmul(T(p.W2), dZ2);                                     // W2ᵀ dZ2
  const dZ1 = bug === 'dropDerivative' ? upstream : pair(upstream, A1, (g, a) => g * (1 - a * a));
  const dW1 = each(matmul(dZ1, T(X)), v => bug === 'dropMean' ? v : v / m);  // dW1 = (1/m) dZ1 Xᵀ
  const db1 = each(sumRows(dZ1), v => v / m);
  return {W1: dW1, b1: db1, W2: dW2, b2: db2};
}

// C2M1 p.37–38：把所有参数拉直成 θ，逐个分量做双边差分
const names = Object.keys(init).flatMap(k => init[k].flatMap((row, i) => row.map((_, j) => k + '[' + i + '][' + j + ']')));
const flatten = p => Object.keys(init).flatMap(k => p[k].flat());
const rebuild = theta => { let i = 0; const p = {}; for (const k of Object.keys(init)) p[k] = init[k].map(row => row.map(() => theta[i++])); return p; };
const theta = flatten(init), dtheta = flatten(backward(init));
const approx = theta.map((_, i) => {
  const plus = theta.slice(), minus = theta.slice(); plus[i] += eps; minus[i] -= eps;
  return (forward(rebuild(plus)).cost - forward(rebuild(minus)).cost) / (2 * eps);
});
const norm = v => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
const relativeDifference = norm(approx.map((a, i) => a - dtheta[i])) / (norm(approx) + norm(dtheta));
const gaps = approx.map((a, i) => Math.abs(a - dtheta[i])), worst = gaps.indexOf(Math.max(...gaps));

const grads = backward(init);
console.log({cost: forward(init).cost, dW2: grads.W2[0], db2: grads.b2[0][0], dW1: grads.W1});
console.log({bug, eps, relativeDifference, worstParameter: names[worst], worstGap: gaps[worst],
  verdict: relativeDifference < 1e-7 ? '约 1e-7 或更小：很好' : relativeDifference < 1e-3 ? '约 1e-5：再仔细检查' : '1e-3 或更大：很可能有 bug'});`};

// ---------- 04 · visual: plain gradient descent vs momentum on J = ½(w₁² + 20w₂²) ----------
const BOWL={a:1,b:20,start:[-4,1],steps:40,beta:.9,blowUp:1e3};
function bowlJ(w){return .5*(BOWL.a*w[0]**2+BOWL.b*w[1]**2);}
function descend(alpha,beta){
 let w=BOWL.start.slice(),v=[0,0];const path=[w.slice()];let divergedAt=0;
 for(let t=1;t<=BOWL.steps;t++){
  const g=[BOWL.a*w[0],BOWL.b*w[1]];
  v=v.map((vi,i)=>beta*vi+(1-beta)*g[i]);           // β = 0 时就是普通梯度下降
  w=w.map((wi,i)=>wi-alpha*v[i]);
  path.push(w.slice());
  if(Math.abs(w[1])>BOWL.blowUp){divergedAt=t;break;}
 }
 return {path,final:w,J:bowlJ(w),diverged:divergedAt>0,divergedAt};
}
function bowlRun(alpha){
 const gd=descend(alpha,0),mom=descend(alpha,BOWL.beta);
 return {alpha,stabilityLimit:2/BOWL.b,gdJ:gd.J,gdDiverged:gd.diverged,gdDivergedAt:gd.divergedAt,gdFinal:gd.diverged?[]:gd.final,
  momJ:mom.J,momDiverged:mom.diverged,momFinal:mom.final,gd,mom};
}
const bx=w1=>60+(w1+4.5)/7*640,by=w2=>190-w2*80;
const clampPt=([w1,w2])=>[Math.max(40,Math.min(720,bx(w1))),Math.max(52,Math.min(318,by(w2)))];
function trail(path,color){
 const pts=path.map(clampPt);
 return `<polyline points="${pts.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`+pts.map(([x,y])=>`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${color}"/>`).join('');
}
V['cs230-04']={title:'学习率与动量：在狭长的碗里走 40 步',param:'学习率 α',min:.02,max:.3,step:.02,value:.08,
 steps:['狭长的碗：J = ½(w₁² + 20w₂²)','普通梯度下降（β = 0）','动量：v = βv + (1 − β)dW，β = 0.9','比较 40 步之后的代价'],
 render(step,alpha){
  const m=bowlRun(alpha);let svg=title('起点 (−4, 1)，横向平缓、纵向陡峭（补充的二次函数）');
  [.5,2,5,10].forEach(level=>{const rx=Math.sqrt(2*level/BOWL.a)/7*640,ry=Math.sqrt(2*level/BOWL.b)*80;svg+=`<ellipse cx="${bx(0)}" cy="${by(0)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" class="v-contour"/>`;});
  svg+=line(40,by(0),720,by(0),'v-axis')+line(bx(0),52,bx(0),318,'v-axis')+text(724,by(0)+4,'w₁','v-small')+text(bx(0)+6,62,'w₂','v-small')+point(bx(0),by(0),4)+point(...clampPt(BOWL.start),5);
  if(step===1||step===3)svg+=trail(m.gd.path,'#f28b82');
  if(step>=2)svg+=trail(m.mom.path,'#50dfc2');
  if(step>=1)svg+=text(60,316,step===2?'绿：动量 β = 0.9':step===1?'红：梯度下降':'红：梯度下降　绿：动量 β = 0.9','v-small');
  const gdText=m.gdDiverged?`第 ${m.gdDivergedAt} 步 |w₂| 超过 1000，已发散`:`40 步后 J = ${fmt(m.gdJ,4)}`;
  const bodies=[
   `讲义 p.19 的图是一个狭长的碗：纵向陡、横向缓。这里用补充的 J = ½(w₁² + 20w₂²) 代替，梯度是 (w₁, 20w₂)，纵向的曲率是横向的 20 倍。拖动学习率 α，看两种方法从同一个起点出发会怎样走。`,
   `普通梯度下降 w := w − α·dW。纵向每一步乘以 (1 − 20α)：α < 0.05 时单调靠近，0.05 < α < 0.1 时来回振荡但幅度缩小，α = 0.1 时振幅不变，α > 0.1 时越振越大。当前 α = ${fmt(alpha,2)}：${gdText}。纵向的稳定性限制了 α，横向因此只能走得很慢。`,
   `动量先对梯度做指数加权平均 v = 0.9v + 0.1dW，再用 W := W − αv（p.20）。纵向的梯度正负交替，平均后相互抵消；横向的梯度方向一致，被保留下来。当前 α = ${fmt(alpha,2)}：40 步后 J = ${fmt(m.momJ,4)}${m.momDiverged?'，已发散':''}。`,
   `当前 α = ${fmt(alpha,2)}。梯度下降：${gdText}；动量：J = ${fmt(m.momJ,4)}。α 小的时候普通梯度下降更快，动量需要大约 10 步“热身”；α 超过 0.1 后梯度下降发散，动量仍然收敛，所以可以用更大的学习率。这一组数字是补充的，结论只对这个二次碗成立。`];
  return {svg,metrics:{alpha:m.alpha,stabilityLimit:m.stabilityLimit,gdJ:m.gdJ,gdDiverged:m.gdDiverged,gdDivergedAt:m.gdDivergedAt,gdFinal:m.gdFinal,momJ:m.momJ,momDiverged:m.momDiverged,momFinal:m.momFinal},
   formula:'梯度下降：W := W − α·dW；动量：v = βv + (1 − β)dW，W := W − α·v（β = 0.9）',body:bodies[step],
   result:`α = ${fmt(alpha,2)} · 梯度下降：${m.gdDiverged?'发散':'J = '+fmt(m.gdJ,4)} · 动量：J = ${fmt(m.momJ,4)}`,
   note:'补充：讲义 p.19 只有示意图，没有具体函数。这里的碗、起点 (−4, 1) 和 40 步都是补充设定；纵向曲率 20 决定了普通梯度下降的稳定上限 α < 2/20 = 0.1。|w₂| 超过 1000 即判为发散并停止绘制。'};
 }};

// ---------- 04 · code: momentum, RMSprop and Adam (with and without bias correction) ----------
C['cs230-04']={name:'动量、RMSprop 与 Adam：同一个碗上的第一步和第 40 步',
 instructions:[
  '先看 firstStep：同一个梯度 (−4, 20)，Adam 第一步在两个坐标上都只移动约 α；去掉偏差校正后变成约 3.16α（C2M2 p.17、p.24）。',
  '把 alpha 改成 0.02：Adam 每步每个坐标最多移动约 α，40 步走不完 −4 到 0 的距离；这说明 Adam 的 α 仍然要调（p.25）。',
  '把 beta1 改成 0（Adam 变成带偏差校正的 RMSprop），或把 steps 改成 200，比较各方法的 J。'],
 expected:'α = 0.1、40 步：梯度下降在 w₂ 上以 ±1 来回振荡，J ≈ 10.0；动量 J ≈ 0.285；RMSprop 几乎到达最小值（J ≈ 6e−42）；Adam J ≈ 0.313；不做偏差校正的 Adam J ≈ 0.0056。Adam 第一步移动 (0.1, −0.1)，未校正时移动 (0.316, −0.316)。这些排名只对这个碗和这组超参数成立。',
 code:`// C2M2 p.20（动量）、p.22（RMSprop）、p.24（Adam）；补充的碗 J = ½(w₁² + 20w₂²)，起点 (−4, 1)
const alpha = 0.1, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, steps = 40;
const gradient = w => [w[0], 20 * w[1]];
const cost = w => 0.5 * (w[0] ** 2 + 20 * w[1] ** 2);

function optimize(method) {
  let w = [-4, 1], v = [0, 0], s = [0, 0], firstStep = null;
  for (let t = 1; t <= steps; t++) {
    const g = gradient(w);
    v = v.map((vi, i) => beta1 * vi + (1 - beta1) * g[i]);        // 一阶矩：动量
    s = s.map((si, i) => beta2 * si + (1 - beta2) * g[i] ** 2);   // 二阶矩：RMSprop
    let update;
    if (method === 'gd') update = g.map(gi => alpha * gi);
    if (method === 'momentum') update = v.map(vi => alpha * vi);
    if (method === 'rmsprop') update = g.map((gi, i) => alpha * gi / Math.sqrt(s[i] + epsilon));
    if (method === 'adam') {
      const vHat = v.map(vi => vi / (1 - beta1 ** t)), sHat = s.map(si => si / (1 - beta2 ** t));
      update = vHat.map((x, i) => alpha * x / (Math.sqrt(sHat[i]) + epsilon));
    }
    if (method === 'adamNoCorrection') update = v.map((x, i) => alpha * x / (Math.sqrt(s[i]) + epsilon));
    if (t === 1) firstStep = update.map(u => -u);                  // 第一步参数实际移动的方向和大小
    w = w.map((wi, i) => wi - update[i]);
  }
  return {final: w, J: cost(w), firstStep};
}

const results = {};
for (const method of ['gd', 'momentum', 'rmsprop', 'adam', 'adamNoCorrection']) results[method] = optimize(method);
console.log({firstGradient: gradient([-4, 1]), adamFirstStep: results.adam.firstStep, uncorrectedFirstStep: results.adamNoCorrection.firstStep});
console.table(Object.entries(results).map(([method, r]) => ({method, w1: r.final[0], w2: r.final[1], J: r.J})));
console.log({finalCost: Object.fromEntries(Object.entries(results).map(([k, r]) => [k, r.J]))});`};

// ---------- 05 · visual: a deep linear network with W[l] = w·I ----------
const DEEP={L:150};
function deepNet(w){
 const layers=DEEP.L-1,log10w=Math.log10(w);
 const logActivation=Array.from({length:layers+1},(_,l)=>l*log10w);          // log10 a[l]，x = (1, 1)
 const logGradient=Array.from({length:layers+1},(_,l)=>(layers-l)*log10w);   // log10 ∂a[L−1]/∂a[l]
 const tolerance=1/layers;                                                     // 150 层后变化不超过 10 倍
 return {w,layers,finalActivation:w**layers,log10Final:layers*log10w,gradientToFirst:w**(layers-1),log10GradientToFirst:(layers-1)*log10w,
  safeLow:10**(-tolerance),safeHigh:10**tolerance,withinTenfold:Math.abs(layers*log10w)<=1+1e-12,logActivation,logGradient};
}
const dy=v=>190-v*2.6;
V['cs230-05']={title:'梯度消失与爆炸：150 层线性网络里的 w^{L−1}',param:'每层权重倍数 w（W[l] = w·I）',min:.5,max:1.5,step:.05,value:1.5,
 steps:['前向：a[l] = w^l · x','反向：梯度同样连乘 w','初始化：让每层的增益接近 1'],
 render(step,w){
  const m=deepNet(w);let svg=title('讲义 p.31：每层 2 个单元，g(z) = z，b = 0，x = (1, 1)，L = 150');
  svg+=line(60,52,60,318,'v-axis')+line(60,dy(0),720,dy(0),'v-axis')+text(64,64,'log₁₀ |值|','v-small')+text(690,dy(0)+18,'层 l','v-small');
  [-40,-20,20].forEach(v=>svg+=line(56,dy(v),64,dy(v),'v-axis')+text(20,dy(v)+4,String(v),'v-small'));
  const xs=l=>60+l/m.layers*650;
  const poly=(values,color)=>`<polyline points="${values.map((v,l)=>`${xs(l).toFixed(1)},${Math.max(52,Math.min(318,dy(v))).toFixed(1)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
  svg+=poly(m.logActivation,'#50dfc2')+text(80,316,'绿：激活 a[l]','v-small');
  if(step>=1)svg+=poly(m.logGradient,'#f28b82')+text(230,316,'红：传回第 l 层的梯度','v-small');
  if(step>=2){svg+=`<rect x="60" y="${dy(1)}" width="650" height="${dy(-1)-dy(1)}" fill="#ffe38a" opacity=".18"/>`+text(72,dy(1)-6,'数量级变化在 10 倍以内的区域','v-small');}
  const state=w>1?'指数增长（爆炸）':w<1?'指数衰减（消失）':'保持不变';
  const bodies=[
   `线性激活、b = 0 时，ŷ = W[L]W[L−1]…W[1]x。令前 L − 1 层都是 W[l] = w·I，则 a[l] = w^l·x。当前 w = ${fmt(w,2)}，第 149 层的激活约为 10^${fmt(m.log10Final,1)}，${state}。讲义的两个例子是 w = 1.5（1.5^{L−1} 爆炸）和 w = 0.5（0.5^{L−1} 消失）。`,
   `反向传播要把同样这些矩阵连乘起来：从第 149 层传回第 l 层，梯度要乘 w^{149−l}，传到第 1 层约为 10^${fmt(m.log10GradientToFirst,1)}。激活消失时梯度也消失，前面的层几乎学不动；爆炸时一步更新就可能跳得很远。`,
   `只有 w 非常接近 1 才安全：要让 150 层后的数量级变化不超过 10 倍，需要 ${fmt(m.safeLow,4)} ≤ w ≤ ${fmt(m.safeHigh,4)}。当前 w = ${fmt(w,2)}，${m.withinTenfold?'在这个范围内':'不在这个范围内'}。p.32 的思路是按输入个数 n 设 Var(w) = 1/n（tanh，Xavier）或 2/n（ReLU，He），让每层的输出方差大致不变，也就是让每层的“增益”接近 1。`];
  return {svg,metrics:{w:m.w,layers:m.layers,finalActivation:m.finalActivation,log10Final:m.log10Final,gradientToFirst:m.gradientToFirst,log10GradientToFirst:m.log10GradientToFirst,safeLow:m.safeLow,safeHigh:m.safeHigh,withinTenfold:m.withinTenfold},
   formula:'a[l] = w^l · x；∂a[L−1]/∂a[l] = w^{L−1−l}（W[l] = w·I，g(z) = z，b = 0）',body:bodies[step],
   result:`w = ${fmt(w,2)} · a[149] ≈ 10^${fmt(m.log10Final,1)} · 传到第 1 层的梯度 ≈ 10^${fmt(m.log10GradientToFirst,1)}`,
   note:'讲义 p.31 手写 L = 150，并假设线性激活和 b = 0，这里照此计算；纵轴是以 10 为底的对数，超出画布的部分被截断。真实网络有非线性激活，这只是说明“连乘”效应的简化模型。'};
 }};
})();
