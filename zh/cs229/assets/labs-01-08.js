/* CS229 01–08: each lesson owns its numerical example, picture and editable program. */
(() => {
  'use strict';
  const H = window.MLVis;
  const V = window.COURSE_VISUALS ||= {};
  const C = window.COURSE_CODE ||= {};
  const {text, line, arrow, rect, node, point, fmt} = H;
  const sigmoid = x => 1 / (1 + Math.exp(-x));
  const normal = (x, mu) => Math.exp(-.5 * (x - mu) ** 2) / Math.sqrt(2 * Math.PI);
  const curve = (fn, low, high, px, py, cls = 'v-trail') => {
    const points = Array.from({length: 81}, (_, i) => { const x = low + (high-low)*i/80; return `${i?'L':'M'}${px(x).toFixed(2)},${py(fn(x)).toFixed(2)}`; });
    return `<path d="${points.join(' ')}" class="${cls}"/>`;
  };
  const bar = (x, y, width, value, label, color = '#50dfc2') => `${rect(x,y,width,18,'v-node',3)}<rect x="${x}" y="${y}" width="${Math.max(0, Math.min(width, width*value))}" height="18" rx="3" fill="${color}"/>${text(x,y-8,label,'v-small')}`;
  const loss = (w,b) => [0,1,2].reduce((s,x)=>s+(w*x+b-(2*x+1))**2,0)/6;

  V['cs229-01'] = {
    title:'阳性之后：分母里的假阳性有多少？', param:'患病率（%）', min:.1,max:20,step:.1,value:1,
    steps:['先验划分人群','分别应用检测概率','只保留检测阳性者','用阳性总数归一化'],
    render(step, prevalence) {
      const prior=prevalence/100, n=10000, sick=n*prior, healthy=n-sick, tp=.9*sick, fp=.05*healthy, posterior=tp/(tp+fp);
      let svg=text(30,29,'同样的检测，基率改变后验','v-title');
      svg+=node(285,48,190,'总人群',`${n} 人`,step===0);
      svg+=arrow(330,114,195,150)+arrow(430,114,555,150);
      svg+=node(75,155,225,'患病',`${fmt(sick,1)} 人 × 90%`,step===1);
      svg+=node(465,155,225,'未患病',`${fmt(healthy,1)} 人 × 5%`,step===1);
      if(step>=2){svg+=arrow(188,223,188,242,'v-yellow')+arrow(578,223,578,242,'v-yellow');svg+=text(188,270,`真阳性 ${fmt(tp,1)}`,'v-center')+text(578,270,`假阳性 ${fmt(fp,1)}`,'v-center');}
      if(step===3){svg+=text(380,310,`阳性中患病比例 = ${fmt(posterior*100,2)}%`,'v-center v-title');}
      const body=[
        `先看没有检测时的人群：在 ${n} 人中，按患病率 ${fmt(prevalence,1)}% 估计有 ${fmt(sick,1)} 名患病者。这里使用期望人数，不表示现实抽样一定恰好得到这些数量。`,
        `灵敏度固定为 90%，假阳性率固定为 5%。两者分别作用于患病与未患病人群，不能直接把“90% 灵敏度”读成“阳性后有 90% 概率患病”。`,
        `检测呈阳性的期望人数包括 ${fmt(tp,1)} 名真阳性与 ${fmt(fp,1)} 名假阳性。虽然假阳性率较低，未患病人群基数很大时，假阳性仍可能更多。`,
        `条件化就是缩小分母：从所有人改为全部阳性者。因此后验为 ${fmt(tp,1)} / (${fmt(tp,1)} + ${fmt(fp,1)}) = ${fmt(posterior,6)}。拖动患病率，观察分母组成如何改变。`
      ];
      return {svg,metrics:{prior,truePositive:tp,falsePositive:fp,posterior},formula:'P(病|+) = 0.9p / [0.9p + 0.05(1−p)]',body:body[step],result:`P(病|+) = ${fmt(posterior,6)} · 真阳性 ${fmt(tp,1)} · 假阳性 ${fmt(fp,1)}`,note:'检测的灵敏度与假阳性率在实验中固定；人数表示概率模型下的期望值。'};
    }
  };
  C['cs229-01']={name:'贝叶斯：亲手算出阳性后的概率',instructions:['先猜测：患病率只有 1% 时，阳性后患病概率是否超过一半？','把 prevalence 从 0.01 改为 0.1，只改变先验，不改变检测性能。','核对真阳性与假阳性人数之和，解释后验分母。'],expected:'默认期望真阳性 90、假阳性 495；P(患病|阳性)=90/585≈0.153846。',code:`const prevalence = 0.01, sensitivity = 0.90, falsePositiveRate = 0.05;
const population = 10000;
const truePositive = population*prevalence*sensitivity;
const falsePositive = population*(1-prevalence)*falsePositiveRate;
const positiveRate = prevalence*sensitivity+(1-prevalence)*falsePositiveRate;
const posterior = truePositive/(truePositive+falsePositive);
console.log({truePositive,falsePositive,positiveRate,posterior});
console.log('检查总概率', positiveRate + prevalence*(1-sensitivity)+(1-prevalence)*(1-falsePositiveRate));`};

  V['cs229-02']={title:'最小二乘：残差怎样变成一次参数更新？',param:'学习率 α',min:.02,max:.5,step:.02,value:.1,steps:['零参数的预测','计算残差','累加两个梯度分量','同时更新 w 与 b','继续迭代 20 步'],render(step,alpha){
    let w=0,b=0; const xs=[0,1,2],ys=[1,3,5],initial=loss(0,0),gw=-13/3,gb=-3;
    const count=step===4?20:step===3?1:0;
    for(let i=0;i<count;i++){const errors=xs.map((x,j)=>w*x+b-ys[j]);const dw=errors.reduce((s,e,j)=>s+e*xs[j],0)/3,db=errors.reduce((s,e)=>s+e,0)/3;w-=alpha*dw;b-=alpha*db;}
    const px=x=>70+x*145,py=y=>275-y*40;
    let svg=text(30,28,'三个点：(0,1)、(1,3)、(2,5)','v-title')+line(55,275,400,275,'v-axis')+line(70,42,70,287,'v-axis');
    for(let i=0;i<3;i++){svg+=text(px(i),300,String(i),'v-center v-small')+point(px(i),py(ys[i]),6);if(step>=1)svg+=line(px(i),py(ys[i]),px(i),py(w*xs[i]+b),'v-yellow');}
    svg+=line(px(0),py(b),px(2),py(2*w+b),'v-trail')+text(72,48,'y','v-small')+text(405,280,'x','v-small');
    svg+=text(450,72,`w = ${fmt(w,6)}`)+text(450,107,`b = ${fmt(b,6)}`)+text(450,142,`J = ${fmt(loss(w,b),6)}`)+text(450,194,`初始 ∂J/∂w = ${fmt(gw,6)}`,'v-small')+text(450,225,'初始 ∂J/∂b = −3','v-small')+text(450,274,`已执行更新：${count} 次`,'v-small');
    const bodies=[`从 w=b=0 开始，三个预测均为零。平方残差的和为 1+9+25=35，目标函数含 1/(2m)，因此初始 J=35/6=${fmt(initial,6)}。`,`黄色线段表示预测与真实值的差。残差 r=ŷ−y=[−1,−3,−5]；带符号的残差决定参数应朝哪个方向移动。`,`w 的梯度是平均 rᵢxᵢ，即 (0−3−10)/3=−13/3。b 的梯度是平均残差 (−1−3−5)/3=−3。两个梯度都要用同一组更新前参数计算。`,`使用 α=${fmt(alpha)} 同时更新：w=α·13/3=${fmt(w,6)}，b=3α=${fmt(b,6)}。拟合线向数据靠近，当前损失为 ${fmt(loss(w,b),6)}。`,`现在从零开始执行 20 次相同的批量更新。当前直线为 y=${fmt(w)}x+${fmt(b)}，与理想参数 w=2,b=1 比较。过大的学习率不保证收敛。`];
    return {svg,metrics:{iterations:count,w,b,loss:loss(w,b),initialLoss:initial,initialGradientW:gw,initialGradientB:gb},formula:'J = Σ(wxᵢ+b−yᵢ)²/(2m)；(w,b) ← (w,b) − α(∂J/∂w, ∂J/∂b)',body:bodies[step],result:`w=${fmt(w,6)} · b=${fmt(b,6)} · J=${fmt(loss(w,b),6)}`,note:'图中固定三点，使用批量梯度下降；黄色为残差，青色为当前拟合直线。'};
  }};
  C['cs229-02']={name:'线性回归：同时更新两个参数',instructions:['手算初始残差与两个梯度，再运行比较。','把 alpha 改成 0.5，观察后续损失是否稳定下降。','对比先算完全部梯度再更新与错误的逐参数原地更新。'],expected:'α=0.1 的第一步：w=0.433333，b=0.3，J≈3.387037；理想拟合为 w=2,b=1。',code:`const x=[0,1,2], y=[1,3,5], alpha=0.1;
let w=0,b=0;
const loss=()=>x.reduce((s,v,i)=>s+(w*v+b-y[i])**2,0)/(2*x.length);
console.log({step:0,w,b,loss:loss()});
for(let step=1;step<=20;step++){
  const residual=x.map((v,i)=>w*v+b-y[i]);
  const dw=residual.reduce((s,r,i)=>s+r*x[i],0)/x.length;
  const db=residual.reduce((s,r)=>s+r,0)/x.length;
  w-=alpha*dw; b-=alpha*db;
  if(step===1||step===20)console.log({step,w,b,loss:loss()});
}`};

  V['cs229-03']={title:'概率与决策：阈值移动，模型概率并不变',param:'分类阈值 τ',min:.1,max:.9,step:.05,value:.5,steps:['固定一个线性得分','Sigmoid 映射为概率','用伯努利似然训练','阈值决定最终动作'],render(step,threshold){
    const z=Math.log(3),p=.75,ce=-Math.log(p),gradient=p-1,px=x=>65+(x+4)*42,py=y=>270-y*210;
    let svg=text(30,27,'同一个样本：z = ln 3，真实标签 y = 1','v-title')+line(60,270,415,270,'v-axis')+line(65,45,65,280,'v-axis');
    svg+=curve(sigmoid,-4,4,px,py)+text(65,295,'−4','v-center v-small')+text(px(0),295,'0','v-center v-small')+text(px(4),295,'4','v-center v-small')+text(30,py(1),'1','v-small');
    if(step>=1)svg+=point(px(z),py(p),7)+line(px(z),py(p),px(z),270,'v-edge')+text(px(z)+12,py(p)-12,'p = 0.75','v-small');
    if(step>=3)svg+=line(65,py(threshold),405,py(threshold),'v-yellow')+text(75,py(threshold)-8,`τ = ${fmt(threshold,2)}`,'v-small');
    svg+=text(450,75,`logit z = ${fmt(z)}`)+text(450,115,'概率 p = 0.750')+text(450,155,`交叉熵 = ${fmt(ce,6)}`)+text(450,195,'∂L/∂z = p−y = −0.25');
    svg+=text(450,250,step>=3?`决策：${p>=threshold?'正类':'负类'}（p ≥ τ）`:'先估计概率，再作决策','v-small');
    const bodies=[`将模型给出的得分固定为 z=ln 3≈${fmt(z)}。得分可以是任意实数，它本身不是概率。`,`Sigmoid 给出 p=1/(1+e^(−ln3))=3/4。等价地，对数几率 log[p/(1−p)]=log 3。`,`当标签 y=1 时，单样本负对数似然为 −log(0.75)≈${fmt(ce,6)}，对 logit 的导数为 p−y=−0.25。训练改变参数，阈值不进入这个损失。`,`阈值 τ=${fmt(threshold,2)} 把相同概率映射为${p>=threshold?'正类':'负类'}。拖动阈值越过 0.75，动作会变，但概率、交叉熵与训练梯度都保持不变。`];
    return {svg,metrics:{logit:z,probability:p,loss:ce,gradient,threshold,prediction:Number(p>=threshold)},formula:'p = σ(z)；L = −log p（y=1）；∂L/∂z = p−y；ŷ = 1[p ≥ τ]',body:bodies[step],result:`p=0.750 · L=${fmt(ce,6)} · 预测类别=${p>=threshold?1:0}`,note:'这张图只演示单个样本。选择阈值通常需要在验证集上比较漏报、误报和业务成本。'};
  }};
  C['cs229-03']={name:'逻辑回归：训练梯度与分类阈值分开计算',instructions:['先计算 z=ln3 对应的概率、交叉熵和导数。','把 threshold 改成 0.8，检查哪些输出改变、哪些不变。','将 label 改成 0，解释对 logit 的梯度为何变成正数。'],expected:'默认 p=0.75、loss≈0.287682、gradient=−0.25、prediction=1；阈值改为0.8只改变prediction。',code:`const logit=Math.log(3), label=1, threshold=0.5;
const odds=Math.exp(logit);
const probability=odds/(1+odds);
// softplus(z)-y*z：稳定的二分类交叉熵表达式
const loss=Math.max(logit,0)+Math.log1p(Math.exp(-Math.abs(logit)))-label*logit;
const gradient=probability-label;
const prediction=Number(probability>=threshold);
console.log({logit,probability,loss,gradient,threshold,prediction});`};

  V['cs229-04']={title:'Poisson GLM：模型预测的是计数的均值',param:'初始计数均值 λ',min:.5,max:6,step:.5,value:2,steps:['用对数链接保持均值为正','画出各个整数计数的概率','对自然参数求导','更新 θ 后重新计算均值'],render(step,lambda){
    const theta=Math.log(lambda),y=3,alpha=.1,grad=lambda-y,nextTheta=theta-alpha*grad,nextLambda=Math.exp(nextTheta);
    const pmf=(k,l)=>{let fact=1;for(let i=2;i<=k;i++)fact*=i;return Math.exp(-l)*l**k/fact;};
    let svg=text(30,27,'观测计数 y = 3；模型 λ = exp(θ)','v-title')+line(55,270,430,270,'v-axis');
    const shown=step===3?nextLambda:lambda;
    for(let k=0;k<=8;k++){const p=pmf(k,shown),x=65+k*41,h=p*520;svg+=`<rect x="${x}" y="${270-h}" width="25" height="${h}" fill="${k===3?'#ffe38a':'#50dfc2'}" opacity=".9"/>`+text(x+12,295,String(k),'v-center v-small');}
    svg+=text(450,74,`θ = ln λ = ${fmt(theta)}`)+text(450,113,`P(Y=3) = ${fmt(pmf(3,shown),6)}`)+text(450,153,`∂L/∂θ = λ−3 = ${fmt(grad)}`)+text(450,207,`θ′ = ${fmt(nextTheta,6)}`)+text(450,247,`λ′ = ${fmt(nextLambda,6)}`);
    const bodies=[`线性预测器 θ 是自然参数，均值是 λ=e^θ。初始 λ=${fmt(lambda)} 对应 θ=${fmt(theta)}；这与逻辑回归将得分映射到 (0,1) 不同，Poisson 均值只需为正。`,`每根柱子是一个非负整数计数的概率，黄色对应观测 y=3。均值 λ 可以不是整数，但随机结果 Y 必须是非负整数。图仅显示 0–8，右侧尾部并未画完。`,`忽略与 θ 无关的 log(3!)，单样本损失为 e^θ−3θ，其导数为 λ−3=${fmt(grad)}。这次是在自然参数 θ 上求导，不是在 λ 上直接走同样长度的一步。`,`用 α=0.1 更新 θ′=θ−0.1(λ−3)，再取指数得到 λ′=${fmt(nextLambda,6)}。柱子显示更新后的分布；当 λ<3 时均值会上升，当 λ>3 时会下降。`];
    return {svg,metrics:{theta,gradient:grad,nextTheta,nextMean:nextLambda,probabilityObserved:pmf(3,shown)},formula:'θ=ln λ；L(θ)=e^θ−yθ+log(y!)；θ′=θ−0.1(e^θ−y)',body:bodies[step],result:`初始 λ=${fmt(lambda)} · 梯度=${fmt(grad)} · 更新后 λ=${fmt(nextLambda,6)}`,note:'单样本教学更新，不是整个数据集的拟合过程。泊松模型假设条件均值等于条件方差。'};
  }};
  C['cs229-04']={name:'Poisson 回归：在 log-mean 空间更新参数',instructions:['预测 λ=2、y=3 时的梯度符号。','把 initialMean 改为 5，观察更新是否改为降低均值。','不要把 theta 的梯度直接当成 mean 的梯度；比较两种参数化。'],expected:'默认 θ=ln2，梯度=−1；θ′=ln2+0.1，λ′=2e^0.1≈2.210342。',code:`const initialMean=2, observedCount=3, alpha=0.1;
const theta=Math.log(initialMean);
const gradient=Math.exp(theta)-observedCount;
const nextTheta=theta-alpha*gradient;
const nextMean=Math.exp(nextTheta);
const logFactorial=n=>Array.from({length:n},(_,i)=>Math.log(i+1)).reduce((a,b)=>a+b,0);
const nll=t=>Math.exp(t)-observedCount*t+logFactorial(observedCount);
console.log({theta,gradient,nextTheta,nextMean,lossBefore:nll(theta),lossAfter:nll(nextTheta)});`};

  V['cs229-05']={title:'高斯生成式分类：先画两类分布，再求后验',param:'观测特征 x',min:-2,max:4,step:.1,value:1.5,steps:['两类分别生成数据','在观测位置读取密度','乘上类别先验','归一化得到类别后验'],render(step,x){
    const p0=normal(x,0),p1=normal(x,2),prior=.5,post=p1/(p0+p1),px=v=>55+(v+3)*45,py=v=>270-v*450;
    let svg=text(30,27,'μ₀ = 0，μ₁ = 2；共同 σ² = 1','v-title')+line(50,270,425,270,'v-axis');
    svg+=curve(v=>normal(v,0),-3,5,px,py,'v-contour')+curve(v=>normal(v,2),-3,5,px,py,'v-trail')+text(px(0),295,'μ₀=0','v-center v-small')+text(px(2),295,'μ₁=2','v-center v-small');
    if(step>=1)svg+=line(px(x),40,px(x),270,'v-yellow')+point(px(x),py(p0),5)+point(px(x),py(p1),5);
    svg+=text(455,75,`x = ${fmt(x,1)}`)+text(455,115,`p(x|0) = ${fmt(p0,6)}`,'v-small')+text(455,147,`p(x|1) = ${fmt(p1,6)}`,'v-small');
    if(step>=2)svg+=text(455,185,'先验 P(0) = P(1) = 0.5','v-small');
    if(step===3)svg+=bar(455,233,235,post,`P(1|x) = ${fmt(post,6)}`)+text(455,286,`P(0|x) = ${fmt(1-post,6)}`,'v-small');
    const bodies=[`生成式模型先描述每个类别如何生成特征：类别0以0为中心，类别1以2为中心，两者方差都为1。这里两类先验相等。`,`在观测 x=${fmt(x,1)} 处，两个密度分别为 ${fmt(p0,6)} 和 ${fmt(p1,6)}。密度不是某个精确实数点的概率，必须与类别后验区分。`,`对每个类别计算“先验×似然”：0.5×${fmt(p0,6)} 与 0.5×${fmt(p1,6)}。如果先验不同，即使两个密度相同，后验也未必相等。`,`对这两个非负权重归一化，得到 P(1|x)=${fmt(post,6)}。共享方差使 log 后验比变为 2x−2，所以本例也能写成 σ(2x−2)。`];
    return {svg,metrics:{likelihoodZero:p0,likelihoodOne:p1,posteriorOne:post},formula:'P(1|x) = φ(x;2,1) / [φ(x;0,1)+φ(x;2,1)] = σ(2x−2)',body:bodies[step],result:`P(1|x)=${fmt(post,6)} · 预测类别=${post>=.5?1:0}`,note:'图中蓝/青曲线是连续概率密度；右侧条形是离散类别后验。它们不是同一种量。'};
  }};
  C['cs229-05']={name:'GDA：从对数似然恢复类别后验',instructions:['在 x=1.5 处，先比较点到两类均值的距离。','将 x 改成 1，检查相等先验下的后验是否为 0.5。','将 priorOne 改成 0.2，观察后验如何改变；此时不要再直接使用 σ(2x−2)。'],expected:'x=1.5、两类先验各0.5时，P(1|x)≈0.731059；对数后验几率为1。',code:`const x=1.5, meanZero=0, meanOne=2, variance=1, priorOne=0.5;
const logNormal=(v,mu)=>-0.5*Math.log(2*Math.PI*variance)-(v-mu)**2/(2*variance);
const logWeightZero=Math.log1p(-priorOne)+logNormal(x,meanZero);
const logWeightOne=Math.log(priorOne)+logNormal(x,meanOne);
const logOdds=logWeightOne-logWeightZero;
const posteriorOne=1/(1+Math.exp(-logOdds));
console.log({logWeightZero,logWeightOne,logOdds,posteriorOne});`};

  V['cs229-06']={title:'二次核：不展开特征，也能得到同一个内积',param:'向量 z 的第二分量',min:0,max:5,step:.5,value:4,steps:['原空间的两个向量','展开三个二次特征','在特征空间相乘求和','用核函数直接得到结果'],render(step,z2){
    const x=[1,2],z=[3,z2],phiX=[1,Math.SQRT2*2,4],phiZ=[9,Math.SQRT2*3*z2,z2*z2],parts=phiX.map((v,i)=>v*phiZ[i]),dot=3+2*z2,kernel=dot*dot;
    const px=v=>65+v*54,py=v=>282-v*42;
    let svg=text(30,27,'K(x,z) = (xᵀz)²','v-title')+line(55,282,290,282,'v-axis')+line(65,45,65,292,'v-axis');
    svg+=arrow(px(0),py(0),px(1),py(2),'v-teal')+arrow(px(0),py(0),px(3),py(z2),'v-yellow')+text(px(1)+10,py(2)-8,'x=(1,2)','v-small')+text(px(3)-15,py(z2)-12,`z=(3,${fmt(z2,1)})`,'v-small');
    svg+=text(325,70,'φ(a,b) = [a², √2ab, b²]','v-small');
    if(step>=1)svg+=text(325,112,`φ(x) = [1, ${fmt(phiX[1])}, 4]`,'v-small')+text(325,148,`φ(z) = [9, ${fmt(phiZ[1])}, ${fmt(phiZ[2],1)}]`,'v-small');
    if(step>=2)svg+=text(325,200,`${fmt(parts[0],1)} + ${fmt(parts[1],1)} + ${fmt(parts[2],1)}`,'v-title');
    if(step>=3)svg+=text(325,255,`= (${fmt(dot,1)})² = ${fmt(kernel,1)}`,'v-title');
    const bodies=[`原空间只有两个坐标。xᵀz = 1×3 + 2×${fmt(z2,1)} = ${fmt(dot,1)}。我们想使用二次交互，而不是只使用这个线性内积。`,`显式映射 φ(a,b)=[a²,√2ab,b²] 包含两个平方项和一个交互项。√2 不是装饰：它保证交互项在内积中得到正确的系数2。`,`对应分量相乘并相加得到 ${fmt(parts[0],1)}+${fmt(parts[1],1)}+${fmt(parts[2],1)}=${fmt(kernel,1)}。这就是高维空间中的普通内积。`,`直接计算 K(x,z)=(xᵀz)²=${fmt(kernel,1)}，结果完全相同。核技巧利用这个等价关系省去显式映射；实际算法还要处理样本数带来的Gram矩阵开销。`];
    return {svg,metrics:{linearDot:dot,explicit:parts.reduce((a,b)=>a+b,0),kernel,contributions:parts},formula:'φ(x)ᵀφ(z) = x₁²z₁² + 2x₁x₂z₁z₂ + x₂²z₂² = (xᵀz)²',body:bodies[step],result:`显式内积=${fmt(kernel,3)} · 核计算=${fmt(kernel,3)}`,note:'这是齐次二次核，没有 +1 项。非齐次核 (1+xᵀz)² 需要额外的常数与线性特征。'};
  }};
  C['cs229-06']={name:'核技巧：检验显式映射与直接核计算相等',instructions:['先预测 (1×3+2×4)² 的结果。','把 φ 中的 Math.SQRT2 删除，观察为什么等价关系失效。','改变 z 的第二分量，重复检查两种计算误差。'],expected:'默认线性内积11，二次核121；显式特征的三项贡献为9、48、64，合计121。',code:`const x=[1,2], z=[3,4];
const phi=([a,b])=>[a*a,Math.SQRT2*a*b,b*b];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const px=phi(x),pz=phi(z);
const contributions=px.map((v,i)=>v*pz[i]);
const explicit=dot(px,pz), direct=dot(x,z)**2;
console.log({phiX:px,phiZ:pz,contributions,explicit,direct,absoluteError:Math.abs(explicit-direct)});
if(Math.abs(explicit-direct)>1e-10)throw Error('特征映射与核不匹配');`};

  V['cs229-07']={title:'SVM：分开的边界，未必拥有规范化的间隔',param:'正权重 w（b=0）',min:.2,max:1.4,step:.1,value:.5,steps:['固定边界与训练点','检查函数间隔约束','区分几何距离和间隔带','加入 hinge loss 并比较目标'],render(step,w){
    const functional=2*w,distance=2,band=1/w,slack=Math.max(0,1-functional),objective=.5*w*w+2*slack,px=x=>255+x*38;
    let svg=text(30,27,'训练点 x=−2,y=−1；x=2,y=1','v-title')+line(45,170,465,170,'v-axis')+line(px(0),60,px(0),265,'v-trail');
    svg+=point(px(-2),170,8,'v-history')+point(px(2),170,8,'v-dot')+text(px(-2),204,'−2 / 负类','v-center v-small')+text(px(2),204,'2 / 正类','v-center v-small')+text(px(0),291,'wx=0：边界始终在 x=0','v-center v-small');
    if(step>=1)svg+=line(px(-band),75,px(-band),255,'v-contour')+line(px(band),75,px(band),255,'v-contour')+text(px(-band),64,'wx=−1','v-center v-small')+text(px(band),64,'wx=1','v-center v-small');
    if(step>=2)svg+=arrow(px(0),232,px(2),232,'v-yellow')+text((px(0)+px(2))/2,253,'距离 2','v-center v-small');
    svg+=text(490,78,`函数间隔 2w = ${fmt(functional)}`,'v-small')+text(490,119,`几何间隔 = ${fmt(distance)}`,'v-small')+text(490,160,`间隔带半宽 1/w = ${fmt(band)}`,'v-small')+text(490,201,`每点 hinge = ${fmt(slack)}`,'v-small')+text(490,250,`目标（C=1）= ${fmt(objective,6)}`,'v-small');
    const bodies=[`所有正的 w 都把两个训练点分开，因为边界 wx=0 始终在 x=0。单看分类是否正确，无法选择一个规范化的 w。`,`硬间隔约束要求 yᵢwxᵢ≥1。本例两点的函数间隔都是 2w=${fmt(functional)}，${functional>=1?'满足':'不满足'}约束。w=0.5 时两点恰好位于 wx=±1 上。`,`点到边界的实际几何距离是 ywx/|w|=2，不随正比例缩放w而变。另一方面，图中的规范化间隔带边界 wx=±1 距离原点为1/w；只有考虑约束后才能把带宽和训练点间隔联系起来。`,`取 C=1，目标为 ½w² + 2·max(0,1−2w)=${fmt(objective,6)}。w太小会违反间隔；w超过0.5后hinge已经为零，但范数惩罚继续增加。本例最优w=0.5，目标0.125。`];
    return {svg,metrics:{w,functionalMargin:functional,geometricMargin:distance,bandHalfWidth:band,hinge:slack,objective},formula:'函数间隔 = ywx；几何间隔 = ywx/|w|；J(w)=½w²+2max(0,1−2w)',body:bodies[step],result:`几何间隔=2 · 每点hinge=${fmt(slack)} · J=${fmt(objective,6)}`,note:'一维、两样本、固定b=0、C=1的教学例子。蓝线是规范化间隔带，青线是分类边界。'};
  }};
  C['cs229-07']={name:'软间隔：区分缩放、hinge 与范数惩罚',instructions:['把 w 从0.5改到1：分类和几何间隔是否改变？','把 w 改为0.2：虽然分类仍正确，为什么hinge不为零？','比较网格搜索得到的最优权重与规范化硬间隔解。'],expected:'默认w=0.5，两点函数间隔均1、几何间隔均2、hinge均0；目标0.125，网格最优w=0.5。',code:`const x=[-2,2], y=[-1,1], w=0.5, C=1;
const margins=x.map((v,i)=>y[i]*w*v);
const hinge=margins.map(m=>Math.max(0,1-m));
const objective=t=>0.5*t*t+C*x.reduce((s,v,i)=>s+Math.max(0,1-y[i]*t*v),0);
const candidates=Array.from({length:140},(_,i)=>(i+1)/100);
const best=candidates.reduce((best,t)=>objective(t)<objective(best)?t:best,candidates[0]);
console.log({w,margins,geometricMargins:margins.map(m=>m/Math.abs(w)),hinge,objective:objective(w),bestWeight:best,bestObjective:objective(best)});`};

  V['cs229-08']={title:'链式法则：把一条梯度拆成三个局部导数',param:'权重 w',min:-1,max:1,step:.1,value:.3,steps:['前向：线性组合','前向：激活与损失','反向：局部导数','相乘得到权重梯度','用有限差分独立检查'],render(step,w){
    const x=2,b=-.2,y=1,z=w*x+b,a=sigmoid(z),error=a-y,L=error*error,da=2*error,ds=a*(1-a),gradient=da*ds*x,eps=1e-5,numeric=((sigmoid((w+eps)*x+b)-y)**2-(sigmoid((w-eps)*x+b)-y)**2)/(2*eps);
    let svg=text(30,27,'固定 x=2，b=−0.2，y=1；L=(a−y)²','v-title');
    const nodes=[[30,78,110,'参数 w',fmt(w)],[205,78,125,'z=wx+b',fmt(z)],[390,78,120,'a=σ(z)',fmt(a)],[570,78,155,'L=(a−1)²',fmt(L,6)]];
    nodes.forEach((n,i)=>{svg+=node(...n,step<2?(step===0?i<=1:i>=2):false);if(i)svg+=arrow(nodes[i-1][0]+nodes[i-1][2]+3,111,n[0]-7,111);});
    if(step>=2){svg+=arrow(640,192,445,192,'v-yellow')+arrow(445,225,265,225,'v-yellow')+arrow(265,260,85,260,'v-yellow');svg+=text(550,181,`∂L/∂a=${fmt(da)}`,'v-center v-small')+text(352,214,`∂a/∂z=${fmt(ds)}`,'v-center v-small')+text(174,249,'∂z/∂w=2','v-center v-small');}
    if(step>=3)svg+=text(485,278,`∂L/∂w = ${fmt(gradient,6)}`,'v-center');
    const bodies=[`先算 z=2w−0.2。当前 w=${fmt(w)}，所以 z=${fmt(z)}。前向计算保存这些中间值，反向时可以重复使用。`,`Sigmoid 得到 a=${fmt(a,6)}，平方损失 L=(a−1)²=${fmt(L,6)}。这里没有乘½，后面的导数因此需要系数2。`,`从损失向后走，三个局部导数分别是 2(a−y)=${fmt(da,6)}、a(1−a)=${fmt(ds,6)}、x=2。黄色箭头表示反向传递，不是参数更新。`,`将一条路径上的导数相乘得到 ∂L/∂w=${fmt(gradient,6)}。反向传播到这里完成了“求梯度”；如何使用梯度更新w是优化器的工作。`,`对w分别加减ε=10⁻⁵重新计算整条前向链，中心差分得到 ${fmt(numeric,6)}。与解析梯度的绝对误差是 ${Math.abs(gradient-numeric).toExponential(2)}，可以独立检查推导。`];
    return {svg,metrics:{logit:z,activation:a,loss:L,analytic:gradient,numeric,absoluteError:Math.abs(gradient-numeric)},formula:'∂L/∂w = 2(a−y) · a(1−a) · x；中心差分 = [L(w+ε)−L(w−ε)]/(2ε)',body:bodies[step],result:`解析梯度=${fmt(gradient,6)} · 数值梯度=${fmt(numeric,6)}`,note:'这是单样本、单神经元、平方损失。与第03讲伯努利交叉熵的导数不同，不可混用。'};
  }};
  C['cs229-08']={name:'反向传播：解析梯度与有限差分交叉检查',instructions:['按照计算图写出三个局部导数，注意本例平方损失没有½。','把 w 改成1或−1，观察sigmoid饱和与梯度大小。','把 epsilon 改为1，比较差分近似误差；它不是任意步长都精确。'],expected:'默认z=0.4、a≈0.598688、loss≈0.161052，解析梯度≈−0.385678，与ε=10⁻⁵的中心差分接近。',code:`const x=2, w=0.3, b=-0.2, target=1, epsilon=1e-5;
const sigmoid=z=>1/(1+Math.exp(-z));
const loss=t=>(sigmoid(t*x+b)-target)**2;
const z=w*x+b, activation=sigmoid(z);
const localDerivatives=[2*(activation-target),activation*(1-activation),x];
const analytic=localDerivatives.reduce((a,b)=>a*b,1);
const numeric=(loss(w+epsilon)-loss(w-epsilon))/(2*epsilon);
console.log({z,activation,loss:loss(w),localDerivatives,analytic,numeric,absoluteError:Math.abs(analytic-numeric)});`};
})();
