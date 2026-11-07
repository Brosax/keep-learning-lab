/* CS229 01–08: only lessons whose notes need one get a module — 02 gradient-descent visual (notes1 p.4–11), 06 kernel-trick LMS code (main_notes ch.5), 07 margin visual (notes3 p.3–7). */
/* CS229 02: batch gradient descent (LMS) on the notes' Portland housing rows — cs229-notes1 p.4–6 (1 LMS algorithm) and p.9–11 (2.2 normal equations). */
(() => {
'use strict';
const {text,line,point,fmt}=window.MLVis;
const V=window.COURSE_VISUALS ||= {};
// 补充：只用讲义 p.1 表格列出的 5 套房；x 以千平方英尺计，y 以千美元计。J(θ) = ½ Σ (h_θ(x⁽ⁱ⁾) − y⁽ⁱ⁾)²，与讲义一致，没有 1/m。
const houses=[[2.104,400],[1.6,330],[2.4,369],[1.416,232],[3.0,540]];
const ITER=1000,LIMIT=1e6;
const gradient=t=>{let g0=0,g1=0;for(const [x,y] of houses){const r=t[0]+t[1]*x-y;g0+=r;g1+=r*x;}return [g0,g1];};
const cost=t=>houses.reduce((s,[x,y])=>s+(t[0]+t[1]*x-y)**2,0)/2;
function normal(){let s1=0,sx=0,sxx=0,sy=0,sxy=0;for(const [x,y] of houses){s1++;sx+=x;sxx+=x*x;sy+=y;sxy+=x*y;}const det=s1*sxx-sx*sx;return [(sxx*sy-sx*sxy)/det,(s1*sxy-sx*sy)/det];}
const thetaStar=normal(),jStar=cost(thetaStar);
function run(alpha){
 let t=[0,0];const path=[t.slice()];let diverged=false,divergedAt=0,firstNear=-1;
 for(let k=1;k<=ITER;k++){const g=gradient(t);t=[t[0]-alpha*g[0],t[1]-alpha*g[1]];
  if(!(Math.abs(t[0])<LIMIT&&Math.abs(t[1])<LIMIT)){diverged=true;divergedAt=k;break;}
  path.push(t.slice());if(firstNear<0&&cost(t)-jStar<=.001*jStar)firstNear=k;}
 const last=path[path.length-1];
 const d1=path[1][1]-thetaStar[1],d2=path[2][1]-thetaStar[1];
 return {path,diverged,divergedAt,firstNear,last,zigzag:d1*d2<0};
}
// 2×2 symmetric eigen-decomposition of XᵀX for the contour ellipses.
const A=(()=>{let s1=0,sx=0,sxx=0;for(const [x] of houses){s1++;sx+=x;sxx+=x*x;}return [[s1,sx],[sx,sxx]];})();
const eig=(()=>{const [[a,b],[,c]]=A,m=(a+c)/2,r=Math.hypot((a-c)/2,b),lo=m-r,hi=m+r;const v=[b,lo-a],n=Math.hypot(...v);return {lo,hi,vlo:[v[0]/n,v[1]/n],vhi:[-v[1]/n,v[0]/n]};})();
// Plot frames.
const PX=[400,740],PY=[310,48],T0=[-80,180],T1=[-20,330];
const px=v=>PX[0]+(v-T0[0])/(T0[1]-T0[0])*(PX[1]-PX[0]),py=v=>PY[0]+(v-T1[0])/(T1[1]-T1[0])*(PY[1]-PY[0]);
const sx=v=>40+(v-1.2)/(3.2-1.2)*310,sy=v=>300-(v-150)/(600-150)*250;
const clip='<defs><clipPath id="cs229-02-clip"><rect x="400" y="48" width="340" height="262"/></clipPath></defs>';
function contours(){let out='';for(const c of [300,3000,20000,80000,250000]){const pts=[];for(let k=0;k<=72;k++){const a=k/72*2*Math.PI,u=Math.sqrt(2*c/eig.lo)*Math.cos(a),w=Math.sqrt(2*c/eig.hi)*Math.sin(a);pts.push(`${px(thetaStar[0]+u*eig.vlo[0]+w*eig.vhi[0]).toFixed(1)},${py(thetaStar[1]+u*eig.vlo[1]+w*eig.vhi[1]).toFixed(1)}`);}out+=`<polyline points="${pts.join(' ')}" class="v-contour"/>`;}return out;}
const inBox=t=>t[0]>=T0[0]-400&&t[0]<=T0[1]+400&&t[1]>=T1[0]-400&&t[1]<=T1[1]+400;
function trail(path,n){const pts=[];for(const t of path.slice(0,n+1)){if(!inBox(t))break;pts.push(`${px(t[0]).toFixed(1)},${py(t[1]).toFixed(1)}`);}return pts.length>1?`<polyline points="${pts.join(' ')}" class="v-trail"/>`:'';}
V['cs229-02']={title:'批量梯度下降：学习率 α 决定收敛、振荡还是发散',param:'学习率 α',min:.005,max:.075,step:.005,value:.03,
 steps:['房价数据与假设 h_θ(x) = θ₀ + θ₁x','J(θ) 的等高线是一族椭圆','批量梯度下降的前 10 步','1000 步之后：与正规方程的解比较'],
 render(step,alpha){
  const r=run(alpha),shown=step<2?0:step===2?Math.min(10,r.path.length-1):r.path.length-1,cur=r.path[shown];
  let svg=clip+text(24,28,'左：5 套房与当前直线；右：J(θ₀, θ₁) 的等高线与梯度下降轨迹','v-title');
  // left panel: data and current hypothesis
  svg+=line(40,300,350,300,'v-axis')+line(40,50,40,300,'v-axis')+text(195,322,'居住面积 x（千平方英尺）','v-small v-center')+text(48,62,'价格 y（千美元）','v-small');
  for(const [x,y] of houses)svg+=point(sx(x),sy(y),5);
  const lineTheta=step===0?thetaStar:cur;const yAt=x=>lineTheta[0]+lineTheta[1]*x,clampY=v=>Math.max(50,Math.min(300,v));
  svg+=`<line x1="${sx(1.2)}" y1="${clampY(sy(yAt(1.2))).toFixed(1)}" x2="${sx(3.2)}" y2="${clampY(sy(yAt(3.2))).toFixed(1)}" class="${step===0?'v-yellow':'v-teal'}"/>`;
  svg+=text(52,82,step===0?`正规方程：h(x) = ${fmt(thetaStar[0],1)} + ${fmt(thetaStar[1],1)}x`:r.diverged&&shown===r.path.length-1?`第 ${r.divergedAt} 步已发散`:`第 ${shown} 步：θ = (${fmt(cur[0],1)}, ${fmt(cur[1],1)})`,'v-small');
  // right panel: contours and trajectory
  svg+=`<g clip-path="url(#cs229-02-clip)">`+(step>=1?contours():'')+(step>=2?trail(r.path,shown):'')+`</g>`;
  svg+=line(400,310,740,310,'v-axis')+line(400,48,400,310,'v-axis')+text(570,326,'θ₀','v-small v-center')+text(408,62,'θ₁','v-small');
  if(step>=1)svg+=point(px(thetaStar[0]),py(thetaStar[1]),6,'v-history')+point(px(0),py(0),5);
  if(step>=2&&inBox(cur))svg+=point(px(Math.max(T0[0],Math.min(T0[1],cur[0]))),py(Math.max(T1[0],Math.min(T1[1],cur[1]))),5);
  const verdict=r.diverged?`发散（第 ${r.divergedAt} 步 |θ| 超过 10⁶）`:r.firstNear<0?`1000 步仍未进入 J* 的 0.1% 以内`:`第 ${r.firstNear} 步进入 J* 的 0.1% 以内`;
  const g0=gradient([0,0]);
  const bodies=[
   `讲义 p.1 的表给出 5 套房（面积、价格）。用 x₀ = 1 的约定，h_θ(x) = θ₀ + θ₁x。黄线是正规方程 θ = (XᵀX)⁻¹Xᵀy 在这 5 套房上的解；讲义用全部 47 套房得到 θ₀ = 71.27、θ₁ = 0.1345（每平方英尺），这里只有 5 套房且 x 以千平方英尺计，所以数值不同。`,
   `J(θ) = ½ Σ (h_θ(x⁽ⁱ⁾) − y⁽ⁱ⁾)² 是 θ 的凸二次函数（p.5），等高线是椭圆，中心（绿色）就是唯一的全局最小值。XᵀX 的两个特征值是 ${fmt(eig.hi,2)} 和 ${fmt(eig.lo,3)}，相差约 100 倍，所以椭圆又扁又长，就像讲义 p.6 的图。从 θ = (0, 0) 出发，梯度是 (${fmt(g0[0],0)}, ${fmt(g0[1],0)})。`,
   `每一步都用全部 5 个样本：θⱼ := θⱼ + α Σᵢ (y⁽ⁱ⁾ − h_θ(x⁽ⁱ⁾)) xⱼ⁽ⁱ⁾（p.5）。当前 α = ${fmt(alpha,3)}。${r.zigzag?'α 大于 1/λ_max ≈ '+fmt(1/eig.hi,4)+'，每一步都冲过陡峭方向的谷底，轨迹来回折返。':'α 小于 1/λ_max ≈ '+fmt(1/eig.hi,4)+'，沿陡峭方向单调靠近谷底，不折返。'}${r.diverged&&r.divergedAt<=10?'步长太大，每一步都离谷底更远。':''}`,
   r.diverged?`α = ${fmt(alpha,3)} 超过 2/λ_max ≈ ${fmt(2/eig.hi,4)}：沿陡峭方向每步误差乘以 |1 − αλ_max| > 1，参数在第 ${r.divergedAt} 步超过 10⁶。讲义说梯度下降“总会收敛”时加了前提：学习率不能太大。`:
    `1000 步后 θ = (${fmt(r.last[0],2)}, ${fmt(r.last[1],2)})，正规方程给出 (${fmt(thetaStar[0],2)}, ${fmt(thetaStar[1],2)})。${verdict}。α 太小时，沿平缓的长轴方向每步只缩小 (1 − αλ_min)，要很多步才走完；这正是讲义提到批量梯度下降代价高、而闭式解一步到位的原因。`];
  return {svg,metrics:{thetaStar,jStar,lambdaMax:eig.hi,lambdaMin:eig.lo,diverged:r.diverged,divergedAt:r.divergedAt,firstNear:r.firstNear,zigzag:r.zigzag,first:r.path[1],last:r.last,lastCost:r.diverged?-1:cost(r.last)},
   formula:'θⱼ := θⱼ + α Σᵢ (y⁽ⁱ⁾ − h_θ(x⁽ⁱ⁾)) xⱼ⁽ⁱ⁾；稳定条件 α < 2/λ_max(XᵀX)；θ* = (XᵀX)⁻¹Xᵀy',
   body:bodies[step],result:`α = ${fmt(alpha,3)} · ${verdict}`,
   note:'补充：讲义没有给出这 5 套房单独拟合的数值，也没有给出学习率的稳定条件；λ_max、λ_min 是 XᵀX 的特征值，由本页代码计算。轨迹超出画框时被裁剪。'};
 }};
})();
/* CS229 06: LMS with the kernel trick — main_notes ch.5, PDF p.51–55 (5.2 LMS with features, 5.3 LMS with the kernel trick, eq. 5.3, 5.8–5.12). */
(() => {
'use strict';
const C=window.COURSE_CODE ||= {};
C['cs229-06']={name:'核技巧版 LMS：只更新 β，却得到同一个 θ',
 instructions:['先运行：比较显式更新 θ（式 5.3）与核化更新 β（式 5.11）得到的 θ、预测值和差距 maxGap。','把 T 改成 1 或 1000，确认 θ = Σβᵢφ(x⁽ⁱ⁾) 在每一步都成立；注意 1000 步时训练误差 J 更小。','把 alpha 改成 0.02，观察两种写法一起发散：核技巧只改变计算方式，不改变算法本身。'],
 expected:'默认输出：200 步后显式 θ ≈ [0.7238, −0.4657, −0.3091, 0.4146]，由 β 还原的 θ 与之相差不到 1e−12；x = 0.75 处两种写法的预测都 ≈ 0.3756。d = 3 时显式 40 维特征的内积与 1 + ⟨x,z⟩ + ⟨x,z⟩² + ⟨x,z⟩³ 都等于 1.875。',
 code:`// 讲义 main_notes §5.1–5.3。补充：5 个一维样本是自设的数字。
const xs = [0, 0.5, 1, 1.5, 2];
const ys = [1, 0.6, 0.2, 0.5, 2.0];
const alpha = 0.01, T = 200, n = xs.length;
const phi = x => [1, x, x * x, x * x * x];            // 式 (5.1)：三次多项式的特征映射
const K = (x, z) => 1 + x * z + (x * z) ** 2 + (x * z) ** 3; // 式 (5.9)，d = 1
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

// 显式做法：θ ∈ R^4，按式 (5.3) 批量更新
let theta = [0, 0, 0, 0];
// 核技巧：只存 β ∈ R^n，先算好核矩阵，再按式 (5.11) β := β + α(y − Kβ)
let beta = new Array(n).fill(0);
const Kmat = xs.map(a => xs.map(b => K(a, b)));

for (let t = 0; t < T; t++) {
  const residual = xs.map((x, i) => ys[i] - dot(theta, phi(x)));
  const step = [0, 1, 2, 3].map(k => residual.reduce((s, r, i) => s + r * phi(xs[i])[k], 0));
  theta = theta.map((th, k) => th + alpha * step[k]);
  const Kbeta = Kmat.map(row => dot(row, beta));
  beta = beta.map((b, i) => b + alpha * (ys[i] - Kbeta[i]));
}

// 式 (5.6)：θ = Σ βᵢ φ(x⁽ⁱ⁾)；式 (5.12)：θᵀφ(x) = Σ βᵢ K(x⁽ⁱ⁾, x)
const thetaFromBeta = [0, 1, 2, 3].map(k => beta.reduce((s, b, i) => s + b * phi(xs[i])[k], 0));
const xq = 0.75;
const predExplicit = dot(theta, phi(xq));
const predKernel = beta.reduce((s, b, i) => s + b * K(xs[i], xq), 0);
const J = 0.5 * xs.reduce((s, x, i) => s + (dot(theta, phi(x)) - ys[i]) ** 2, 0);
console.log({ T, theta: theta.map(v => +v.toFixed(6)), beta: beta.map(v => +v.toFixed(6)), J: +J.toFixed(6) });
console.log({ maxGap: Math.max(...theta.map((v, k) => Math.abs(v - thetaFromBeta[k]))), predExplicit, predKernel });

// 式 (5.5)/(5.9)：d = 3 时含重复的全部 ≤3 次单项式共 1 + d + d² + d³ = 40 维
const x = [1, 2, -1], z = [0.5, 1, 2];
const monomials = v => { const out = [1, ...v];
  for (const a of v) for (const b of v) out.push(a * b);
  for (const a of v) for (const b of v) for (const c of v) out.push(a * b * c);
  return out; };
const xz = dot(x, z);
console.log({ featureDim: monomials(x).length, explicitInner: dot(monomials(x), monomials(z)), kernelInner: 1 + xz + xz ** 2 + xz ** 3 });
`}; 
})();
/* CS229 07: functional vs geometric margins and the optimal margin classifier — cs229-notes3 p.3–7 (3 Functional and geometric margins / 4 The optimal margin classifier). */
(() => {
'use strict';
const {text,line,point,fmt}=window.MLVis;
const V=window.COURSE_VISUALS ||= {};
// 补充：6 个自设的二维训练样本，y ∈ {−1, 1}（讲义 p.3 的记号）。
const data=[[2,2,1],[2.5,3.5,1],[3.5,1.5,1],[0,.5,-1],[.5,-1,-1],[-1,1,-1]];
// For a unit direction u, the best offset puts the boundary halfway between the classes' extreme projections.
function fit(deg){
 const r=deg*Math.PI/180,u=[Math.cos(r),Math.sin(r)];
 const proj=data.map(([x1,x2])=>u[0]*x1+u[1]*x2);
 const posMin=Math.min(...proj.filter((_,i)=>data[i][2]>0)),negMax=Math.max(...proj.filter((_,i)=>data[i][2]<0));
 const gamma=(posMin-negMax)/2,b=-(posMin+negMax)/2;
 const geometric=data.map(([,,y],i)=>y*(proj[i]+b));
 const support=geometric.map((g,i)=>Math.abs(g-gamma)<1e-9?i:-1).filter(i=>i>=0);
 return {u,b,gamma,geometric,support};
}
function optimum(){let best={gamma:-Infinity,deg:0};for(let k=0;k<=18000;k++){const d=k/100,f=fit(d);if(f.gamma>best.gamma+1e-12)best={gamma:f.gamma,deg:d};}return best;}
const OPT=optimum();
const X=[-2,5],Y=[-2,4.5];const px=v=>30+(v-X[0])/(X[1]-X[0])*380,py=v=>310-(v-Y[0])/(Y[1]-Y[0])*262;
function boundary(u,b,offset,cls){ // points with uᵀx + b = offset
 const pts=[];if(Math.abs(u[1])>1e-9){for(const x of X)pts.push([x,(offset-b-u[0]*x)/u[1]]);}else{for(const y of Y)pts.push([(offset-b)/u[0],y]);}
 return `<line x1="${px(pts[0][0]).toFixed(1)}" y1="${py(pts[0][1]).toFixed(1)}" x2="${px(pts[1][0]).toFixed(1)}" y2="${py(pts[1][1]).toFixed(1)}" class="${cls}"/>`;
}
V['cs229-07']={title:'函数间隔与几何间隔：转动分类边界，找最大的最小间隔',param:'w 的方向（度）',min:0,max:180,step:5,value:45,
 steps:['训练集与线性分类器 h_{w,b}(x) = g(wᵀx + b)','函数间隔：把 (w, b) 放大 2 倍会怎样','几何间隔：每个点到边界的距离','最优间隔分类器：在所有方向中让 γ 最大'],
 render(step,deg){
  const f=fit(deg),{u,b,gamma}=f;
  // canonical scaling: functional margin of the closest point equals 1 (only meaningful when gamma > 0)
  const scale=gamma>0?1/gamma:1,w=[u[0]*scale,u[1]*scale],bc=b*scale,normW=Math.hypot(...w);
  const functional=data.map(([x1,x2,y])=>y*(w[0]*x1+w[1]*x2+bc));
  const functional2=functional.map(v=>2*v);
  let svg=`<defs><clipPath id="cs229-07-clip"><rect x="30" y="48" width="380" height="262"/></clipPath></defs>`+text(24,28,`方向 ${fmt(deg,0)}°：边界 wᵀx + b = 0（黄），间隔边界 = ±1（虚线）`,'v-title');
  svg+=line(30,310,410,310,'v-axis')+line(30,48,30,310,'v-axis')+text(400,326,'x₁','v-small v-end')+text(36,62,'x₂','v-small');
  svg+=`<g clip-path="url(#cs229-07-clip)">`+boundary(u,b,0,'v-yellow')+(gamma>0?boundary(u,b,gamma,'v-loop')+boundary(u,b,-gamma,'v-loop'):'')+`</g>`;
  data.forEach(([x1,x2,y],i)=>{const sv=step>=2&&f.support.includes(i);svg+=`<circle cx="${px(x1).toFixed(1)}" cy="${py(x2).toFixed(1)}" r="${sv?9:6}" fill="${y>0?'#65b6f3':'#e4ad65'}" stroke="${sv?'#50dfc2':'#0d1420'}" stroke-width="${sv?3:1.5}"/>`;svg+=text(px(x1)+10,py(x2)-8,`${y>0?'+':'−'}${i+1}`,'v-small');});
  if(step===1||step===2){
   svg+=text(440,70,step===1?'点  γ̂⁽ⁱ⁾（规范化）  放大 2 倍后':'点  几何间隔 γ⁽ⁱ⁾','v-small');
   data.forEach((_,i)=>{const y=96+i*30;svg+=text(440,y,`${data[i][2]>0?'+':'−'}${i+1}`,'v-small')+text(500,y,step===1?fmt(functional[i],3):fmt(f.geometric[i],3),'v-small')+(step===1?text(640,y,fmt(functional2[i],3),'v-small'):'');});
   svg+=text(440,290,step===1?`‖w‖ = ${fmt(normW,3)}，放大后 ${fmt(2*normW,3)}`:`γ = minᵢ γ⁽ⁱ⁾ = ${fmt(gamma,3)}`,'v-small');
  }
  if(step===3){
   const gx=d=>440+d/180*290,gy=g=>190-g*55;svg+=line(440,190,730,190,'v-axis')+line(440,60,440,310,'v-axis')+text(585,326,'w 的方向（度）','v-small v-center')+text(446,72,'γ','v-small');
   const pts=[];for(let d=0;d<=180;d+=2.5)pts.push(`${gx(d).toFixed(1)},${Math.max(52,Math.min(318,gy(fit(d).gamma))).toFixed(1)}`);svg+=`<polyline points="${pts.join(' ')}" class="v-teal"/>`;
   svg+=point(gx(OPT.deg),gy(OPT.gamma),6,'v-history')+point(gx(deg),Math.max(52,Math.min(318,gy(gamma))),5)+text(gx(OPT.deg)+8,gy(OPT.gamma)-10,`最优 ${fmt(OPT.deg,2)}°，γ = ${fmt(OPT.gamma,3)}`,'v-small');
  }
  const sep=gamma>0;
  const bodies=[
   `讲义 p.3 改用 y ∈ {−1, 1}，分类器写成 h_{w,b}(x) = g(wᵀx + b)，wᵀx + b ≥ 0 时预测 1。这里固定 w 的方向为 ${fmt(deg,0)}°，b 取让两类最靠近边界的点等距的值。${sep?'这个方向能把两类分开。':'这个方向上无论 b 取多少，都至少有一个点被分错。'}`,
   sep?`函数间隔 γ̂⁽ⁱ⁾ = y⁽ⁱ⁾(wᵀx⁽ⁱ⁾ + b)（p.3–4）。这里把 (w, b) 缩放到最近的点 γ̂ = 1，此时 ‖w‖ = ${fmt(normW,3)}。右栏把 (w, b) 同时乘 2：每个 γ̂⁽ⁱ⁾ 都翻倍，但 sign(wᵀx + b) 和边界位置都没变。所以单独追求“函数间隔大”没有意义，讲义因此需要几何间隔或者对 ‖w‖ 做归一化。`:`这个方向分不开两类，最近的点 γ̂ < 0，没有办法把它缩放成 1。放大 (w, b) 只会让负的函数间隔更负，边界不变。`,
   `几何间隔 γ⁽ⁱ⁾ = y⁽ⁱ⁾((w/‖w‖)ᵀx⁽ⁱ⁾ + b/‖w‖)，是点到边界的有符号距离（p.4–5），与 (w, b) 的缩放无关。训练集的几何间隔取最小值：γ = ${fmt(gamma,3)}。绿圈是取到最小值的点。${sep?'':'γ 为负，说明有点落在错误的一侧。'}`,
   `最优间隔分类器（p.5–7）在所有 (w, b) 中让 γ 最大。曲线给出每个方向能达到的 γ：最大值在约 ${fmt(OPT.deg,2)}° 处，γ* = ${fmt(OPT.gamma,3)}；当前 ${fmt(deg,0)}° 的 γ = ${fmt(gamma,3)}。等价地，固定 γ̂ = 1 后最小化 ½‖w‖²，在最优点 ‖w‖ = 1/γ* = ${fmt(1/OPT.gamma,3)}，½‖w‖² = ${fmt(1/(2*OPT.gamma*OPT.gamma),3)}。最优边界只由绿圈的点决定，它们就是支持向量。`];
  return {svg,metrics:{gamma,b,support:f.support,functional,functional2,normW,optimalGamma:OPT.gamma,optimalDegree:OPT.deg,optimalObjective:1/(2*OPT.gamma*OPT.gamma),separable:sep},
   formula:'γ̂⁽ⁱ⁾ = y⁽ⁱ⁾(wᵀx⁽ⁱ⁾ + b)；γ⁽ⁱ⁾ = γ̂⁽ⁱ⁾ / ‖w‖；γ = minᵢ γ⁽ⁱ⁾；min ½‖w‖² s.t. y⁽ⁱ⁾(wᵀx⁽ⁱ⁾ + b) ≥ 1',
   body:bodies[step],result:`方向 ${fmt(deg,0)}° · γ = ${fmt(gamma,3)} · 最优 γ* = ${fmt(OPT.gamma,3)}`,
   note:'补充：6 个样本是自设的；讲义 p.1 的 A、B、C 三点没有给坐标。b 对每个方向都取最优值，所以曲线是“这个方向能做到的最大几何间隔”；方向的最优值用 0.01° 网格搜索得到。'};
 }};
})();
