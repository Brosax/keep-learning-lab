/* CS229 16–22: chapter-specific numerical experiments, all data synthetic. */
(() => {
  'use strict';
  const H = window.MLVis;
  const V = window.COURSE_VISUALS ||= {};
  const C = window.COURSE_CODE ||= {};
  const {text, line, arrow, rect, node, point, fmt} = H;
  const sum = a => a.reduce((s, x) => s + x, 0);
  const mean = a => sum(a) / a.length;
  const polyline = (points, cls='v-trail') => `<polyline points="${points.map(p=>p.join(',')).join(' ')}" class="${cls}"/>`;
  const frame = (title, subtitle='') => text(28,30,title,'v-title') + (subtitle ? text(28,55,subtitle,'v-small') : '');

  V['cs229-16'] = {
    title:'PCA：投影保留了多少方差，丢掉了多少信息？',
    param:'候选投影方向 θ（度）', min:0, max:90, step:5, value:0,
    steps:['中心化后的四个样本','选择一个单位方向','投影与正交重建','计算方差和误差','比较候选方向'],
    render(step, degrees) {
      const a=degrees*Math.PI/180, u=[Math.cos(a),Math.sin(a)];
      const xs=[[2,0],[-2,0],[0,1],[0,-1]];
      const zs=xs.map(p=>p[0]*u[0]+p[1]*u[1]);
      const reconstructed=zs.map(z=>[z*u[0],z*u[1]]);
      const projectedVariance=mean(zs.map(z=>z*z));
      const reconstructionMSE=mean(xs.map((p,i)=>sum(p.map((x,j)=>(x-reconstructed[i][j])**2))));
      const retainedFraction=projectedVariance/2.5;
      const px=x=>225+65*x, py=y=>180-65*y;
      let svg=frame('Σ = diag(2, 0.5) · 总方差 2.5','四个点已中心化；本例不用额外标准化。');
      svg+=line(45,180,415,180,'v-axis')+line(225,70,225,295,'v-axis');
      svg+=text(418,185,'x₁','v-small')+text(233,76,'x₂','v-small');
      xs.forEach((p,i)=>{svg+=point(px(p[0]),py(p[1]),6,'v-history');if(step===0)svg+=text(px(p[0])+9,py(p[1])-7,`x${i+1}`,'v-small');});
      if(step>=1) svg+=line(px(-2.3*u[0]),py(-2.3*u[1]),px(2.3*u[0]),py(2.3*u[1]),'v-yellow')+arrow(225,180,px(u[0]),py(u[1]),'v-yellow');
      if(step>=2) xs.forEach((p,i)=>{const r=reconstructed[i];svg+=line(px(p[0]),py(p[1]),px(r[0]),py(r[1]),'v-edge')+point(px(r[0]),py(r[1]),4,'v-dot');});
      svg+=text(470,105,`u = (${fmt(u[0])}, ${fmt(u[1])})`,'v-small');
      if(step>=2) svg+=text(470,143,`投影 z₁ = ${fmt(zs[0])}`,'v-small');
      if(step>=3) svg+=text(470,182,`保留方差 ${fmt(projectedVariance)}`,'v-title')+text(470,219,`解释比例 ${(100*retainedFraction).toFixed(1)}%`,'v-small')+text(470,256,`重建误差 ${fmt(reconstructionMSE)}`,'v-small');
      const body=[
        '先看四个样本 (2,0)、(−2,0)、(0,1)、(0,−1)。均值为零，所以协方差可直接按 Σ = XᵀX/4 计算，两个坐标方向的方差分别为 2 和 0.5。',
        `黄色直线是候选的一维子空间，u 是其单位方向。当前方向为 ${degrees}°。PCA 寻找的是投影方差最大的方向，而不是人为指定的某一条斜线。`,
        `每个点先投影为标量 zᵢ = uᵀxᵢ，再重建为 x̂ᵢ = zᵢu。蓝绿色点是原样本，黄色点是重建；连接线正是被压缩丢掉的残差。`,
        `当前投影方差为 ${fmt(projectedVariance)}，平均平方重建误差为 ${fmt(reconstructionMSE)}，两者之和仍为总方差 2.5。θ = 0° 时解释 80% 方差，并留下 0.5 的平均重建误差。`,
        `把方向从 0° 调到 90°，解释比例会从 80% 降到 20%。最大方差方向也最小化本例的平方重建误差；但这里没有标签，不能据此保证保留了分类所需的信息。`
      ][step];
      return {svg,formula:'Var(Xu) = 2 cos²θ + 0.5 sin²θ；MSE = 2.5 − Var(Xu)',body,result:`保留 ${(100*retainedFraction).toFixed(1)}% · 重建 MSE ${fmt(reconstructionMSE)}`,note:'协方差采用除以 m 的约定；MSE 为每个样本两维残差平方和的平均值。',metrics:{projectedVariance,reconstructionMSE,retainedFraction}};
    }
  };
  C['cs229-16']={name:'PCA：扫描投影角度并核对重建误差',instructions:['先预测 θ = 0° 与 90° 的解释方差比例。','修改 degrees，再比较 projectedVariance 与 reconstructionMSE。','把某个坐标放大 10 倍，解释为何是否标准化会改变结果。'],expected:'degrees = 0 时，投影方差 2、解释比例 0.8、平均重建误差 0.5；两者方差与误差相加为 2.5。',code:`const points = [[2,0],[-2,0],[0,1],[0,-1]];
const degrees = 0; // 改成 45、90 比较
const a = degrees*Math.PI/180, u = [Math.cos(a), Math.sin(a)];
const projection = points.map(p => p[0]*u[0]+p[1]*u[1]);
const projectedVariance = projection.reduce((s,z)=>s+z*z,0)/points.length;
const reconstructionMSE = points.reduce((s,p,i)=>s+p.reduce((r,v,j)=>r+(v-projection[i]*u[j])**2,0),0)/points.length;
console.log({degrees, projection, projectedVariance, retainedFraction:projectedVariance/2.5, reconstructionMSE});
console.log('方差 + 平均重建误差', projectedVariance+reconstructionMSE);
if (Math.abs(projectedVariance+reconstructionMSE-2.5)>1e-10) throw Error('正交重建恒等式未成立');`};

  V['cs229-17']={
    title:'ICA：不相关的两个量，为什么仍可能依赖？',
    param:'对白化信号的旋转角 θ（度）',min:0,max:90,step:5,value:45,
    steps:['四个独立源组合','旋转后仍然白化','协方差看不出依赖','检查四阶矩','比较非高斯对比量'],
    render(step,degrees){
      const sources=[[-1,-1],[-1,1],[1,-1],[1,1]], a=degrees*Math.PI/180;
      const rotated=sources.map(([s,t])=>[Math.cos(a)*s+Math.sin(a)*t,-Math.sin(a)*s+Math.cos(a)*t]);
      const varianceU=mean(rotated.map(p=>p[0]**2)),varianceV=mean(rotated.map(p=>p[1]**2));
      const covariance=mean(rotated.map(p=>p[0]*p[1]));
      const fourthCrossMoment=mean(rotated.map(p=>p[0]**2*p[1]**2));
      const fourthU=mean(rotated.map(p=>p[0]**4));
      const kurtosisU=fourthU/(varianceU**2)-3;
      const kurtosisV=mean(rotated.map(p=>p[1]**4))/(varianceV**2)-3;
      const contrast=Math.abs(kurtosisU)+Math.abs(kurtosisV);
      const data=step===0?sources:rotated;
      let svg=frame(step===0?'每种源组合的概率都是 1/4':'旋转只改变方向，不改变协方差矩阵','非高斯源：s₁、s₂ 独立，且都只取 −1 或 +1。');
      svg+=line(55,184,405,184,'v-axis')+line(230,74,230,294,'v-axis');
      data.forEach(p=>svg+=point(230+p[0]*70,184-p[1]*70,7,step===0?'v-history':'v-dot'));
      svg+=text(410,190,step===0?'s₁':'u','v-small')+text(238,82,step===0?'s₂':'v','v-small');
      if(step>=1)svg+=text(460,102,`Var(u) = ${fmt(varianceU)}`,'v-small')+text(460,134,`Var(v) = ${fmt(varianceV)}`,'v-small');
      if(step>=2)svg+=text(460,173,`Cov(u,v) = ${fmt(covariance)}`,'v-title');
      if(step>=3)svg+=text(460,210,`E[u²v²] = ${fmt(fourthCrossMoment)}`,'v-small')+text(460,242,`E[u²] E[v²] = ${fmt(varianceU*varianceV)}`,'v-small');
      if(step>=4)svg+=text(460,284,`|κ(u)| + |κ(v)| = ${fmt(contrast)}`,'v-small');
      const body=[
        '枚举两个独立 Rademacher 源的四种等概率组合。这是一个精确的离散概率分布，不是一次随机采样；四个点的两个坐标彼此独立，方差都为 1。',
        `用正交矩阵把源旋转 ${degrees}°。旋转后的 (u,v) 仍有单位方差且协方差为 0，所以它已经满足白化条件。白化不能告诉我们哪一个方向对应独立源。`,
        '当 θ = 45°，四个点落到坐标轴上：一旦知道 u 非零，就能断定 v = 0。它们虽然协方差为零，仍明显存在统计依赖。',
        `独立性会推出 E[u²v²] = E[u²]E[v²]。当前左边为 ${fmt(fourthCrossMoment)}，右边为 1；在 45° 时左边为 0，直接给出了“不相关但不独立”的反例。相等只是一个必要检查，不是一般分布的独立性证明。`,
        `在这个已知的非高斯例子里，源方向 0° 或 90° 的绝对超额峰度和为 4，45° 时降为 2。ICA 可以利用这种高阶结构寻找候选方向，但仍有符号、排列与尺度歧义。`
      ][step];
      return {svg,formula:'u = cosθ·s₁ + sinθ·s₂；v = −sinθ·s₁ + cosθ·s₂',body,result:`协方差 ${fmt(covariance)} · 四阶交叉矩 ${fmt(fourthCrossMoment)} · 对比量 ${fmt(contrast)}`,note:'展示白化与独立性的区别；此有限分布不代表所有 ICA 问题，也未声称峰度足以识别任意源。',metrics:{varianceU,varianceV,covariance,fourthCrossMoment,kurtosisU,kurtosisV,contrast}};
    }
  };
  C['cs229-17']={name:'ICA：用四阶矩揭示白化后的依赖',instructions:['先判断协方差为零是否足以保证独立。','把 degrees 从 45 改成 0，比较四阶交叉矩。','扫描角度下的峰度对比量，说明为什么两个最优方向可能只交换源顺序。'],expected:'45° 时两个方差都是 1，协方差 0；E[u²v²]≈0，而 E[u²]E[v²]=1。两路超额峰度均为 −1，对比量为 2。',code:`const sources = [[-1,-1],[-1,1],[1,-1],[1,1]]; // 四种情况等概率
const degrees = 45;
const mean = xs => xs.reduce((a,b)=>a+b,0)/xs.length;
function measure(degrees) {
  const a = degrees*Math.PI/180;
  const z = sources.map(([s,t])=>[Math.cos(a)*s+Math.sin(a)*t,-Math.sin(a)*s+Math.cos(a)*t]);
  const varianceU=mean(z.map(p=>p[0]**2)), varianceV=mean(z.map(p=>p[1]**2));
  const covariance=mean(z.map(p=>p[0]*p[1]));
  const fourthCrossMoment=mean(z.map(p=>p[0]**2*p[1]**2));
  const kurtosisU=mean(z.map(p=>p[0]**4))/varianceU**2-3;
  const kurtosisV=mean(z.map(p=>p[1]**4))/varianceV**2-3;
  return {degrees,varianceU,varianceV,covariance,fourthCrossMoment,independenceProduct:varianceU*varianceV,kurtosisU,kurtosisV,contrast:Math.abs(kurtosisU)+Math.abs(kurtosisV)};
}
console.log(measure(degrees));
console.log('方向对比', [0,15,30,45,60,75,90].map(a=>({degrees:a,contrast:measure(a).contrast})));
// 此分布中 0°/90° 对应源方向。一般 ICA 还存在排列、符号和尺度歧义。`};

  function planning(gamma,iterations){let a=0,b=0;for(let t=0;t<iterations;t++){const nextA=Math.max(2.5,1+gamma*b),nextB=2+gamma*b;a=nextA;b=nextB;}return [a,b];}
  V['cs229-18']={
    title:'Bellman：用已知转移把未来奖励向前传',
    param:'折扣率 γ',min:0,max:.85,step:.05,value:.5,
    steps:['已知的 MDP 模型','初始价值为零','一次价值迭代','两次价值迭代','四次价值迭代','八次价值迭代','求固定点与最优动作'],
    render(step,gamma){
      const fixedB=2/(1-gamma),goValue=1+gamma*fixedB,fixedA=Math.max(2.5,goValue);
      const iterations=[0,0,1,2,4,8,0][step];
      const values=step===6?[fixedA,fixedB]:planning(gamma,iterations);
      let svg=frame('A：即停得到 2.5，或得到 1 后进入 B','B：每一步得到 2，并确定性地回到 B。终止后价值为 0。');
      svg+=arrow(239,130,432,130,'v-edge')+text(335,112,'奖励 1','v-small v-center');
      svg+=node(85,97,154,'状态 A',`V = ${fmt(values[0])}`,step>=2)+node(445,97,154,'状态 B',`V = ${fmt(values[1])}`,step>=2);
      svg+=`<path d="M 599 130 H 656 V 83 H 522 V 96" class="v-yellow" marker-end="url(#visual-arrow)"/>`+text(665,117,'+2','v-small');
      svg+=arrow(162,164,162,205,'v-edge')+node(85,214,154,'终止',`即停奖励 2.5`,false);
      if(step>=2)svg+=text(285,211,`Vₖ₊₁(B) = 2 + ${fmt(gamma)} Vₖ(B)`,'v-small')+text(285,244,`Vₖ₊₁(A) = max(2.5, 1 + γVₖ(B))`,'v-small');
      if(step===6)svg+=text(285,287,`最优动作：${goValue>2.5?'进入 B':goValue<2.5?'即停':'两者等价'}`,'v-title');
      const descriptions=[
        '这一次转移与奖励都已知，所以我们在做规划，而不是从环境采样学习。状态 A 有两个动作；B 只有一个带奖励的自环。每次更新使用上一轮的价值，不能把同一轮的新旧值混用。',
        '从 V₀(A)=V₀(B)=0 开始，相当于暂时忽略未来。终止状态的后续价值也为零，但它是问题定义，而不是初始化后仍要更新的普通状态。',
        `第一次更新得到 A=${fmt(values[0])}、B=${fmt(values[1])}。此时 A 只能看到立即奖励，B 的长期收益还没有传回来。`,
        `第二次更新把 B 的上轮价值带回 A：A=${fmt(values[0])}、B=${fmt(values[1])}。有限轮数是近似规划，不能把尚未收敛的动作偏好误当成最终结论。`,
        `四次同步更新后，A=${fmt(values[0])}、B=${fmt(values[1])}。未来奖励经过一次次 Bellman 备份逐步影响当前选择。`,
        `八次更新得到 A=${fmt(values[0])}、B=${fmt(values[1])}。γ<1 时，这个有限 MDP 的 Bellman 最优算子是收缩映射，继续迭代会逼近固定点。`,
        `直接解 B=2+γB，得到 V*(B)=${fmt(fixedB)}。进入 B 的动作值为 ${fmt(goValue)}，与立即停止的 2.5 比较即可。γ=0.5 时 B=4、A=3，应进入 B。`
      ];
      return {svg,formula:'Vₖ₊₁(A)=max{2.5, 1+γVₖ(B)}；Vₖ₊₁(B)=2+γVₖ(B)',body:descriptions[step],result:`V(A) ${fmt(values[0])} · V(B) ${fmt(values[1])} · ${step===6?'固定点':`迭代 ${iterations} 次`}`,note:'此例为已知模型、确定性转移、无限时域折扣回报；与下一讲的单样本 Q 更新不同。',metrics:{gamma,currentA:values[0],currentB:values[1],fixedA,fixedB,goValue}};
    }
  };
  C['cs229-18']={name:'MDP：同步价值迭代与解析固定点互相验证',instructions:['先手算 V₁、V₂，判断 A 为什么不立即偏好长期路线。','把 gamma 从 0.5 改成 0.2，比较最终策略。','用解析值 2/(1−gamma) 检查迭代是否收敛。'],expected:'gamma=0.5 时 V₁=(2.5,2)、V₂=(2.5,3)，收敛到 V*(A)=3、V*(B)=4；A 的最优动作是进入 B。',code:`const gamma = 0.5; // 必须 0 <= gamma < 1
if (gamma < 0 || gamma >= 1) throw Error('折扣率必须在 [0,1)');
let A=0, B=0;
for (let iteration=1;iteration<=300;iteration++) {
  // 同步备份：两个新值都用旧 B。
  const nextA=Math.max(2.5,1+gamma*B), nextB=2+gamma*B;
  const difference=Math.max(Math.abs(nextA-A),Math.abs(nextB-B));
  A=nextA; B=nextB;
  if (iteration<=4) console.log({iteration,A,B});
  if (difference<1e-10) break;
}
const fixedB=2/(1-gamma), fixedA=Math.max(2.5,1+gamma*fixedB);
console.log({A,B,fixedA,fixedB,policyA:1+gamma*B>2.5?'进入 B':'即停'});
if (Math.max(Math.abs(A-fixedA),Math.abs(B-fixedB))>1e-7) throw Error('迭代还未足够接近固定点');`};

  V['cs229-19']={
    title:'Q-learning：一条经验如何改变一个价值估计？',
    param:'学习率 α',min:0,max:1,step:.05,value:.5,
    steps:['读一条转移经验','构造自举目标','计算 TD 误差','更新被访问的动作','比较 SARSA 与终止转移'],
    render(step,alpha){
      const oldQ=2,reward=1,gamma=.9,nextMax=4,nextChosen=3;
      const target=reward+gamma*nextMax,tdError=target-oldQ,qNew=oldQ+alpha*tdError;
      const sarsaTarget=reward+gamma*nextChosen,sarsaNew=oldQ+alpha*(sarsaTarget-oldQ),terminalNew=oldQ+alpha*(reward-oldQ);
      let svg=frame('经验 (s, a, r=1, s′) · 当前 Q(s,a)=2','社区扩展：本例从一条经验更新，不访问完整转移概率模型。');
      svg+=node(40,95,160,'Q(s,a)',`旧值 ${fmt(oldQ)}`,step===0)+arrow(205,128,275,128)+node(285,95,190,'自举目标',step>=1?`${fmt(target)}`:'等待计算',step===1)+arrow(480,128,545,128)+node(555,95,160,'Q 新值',step>=3?fmt(qNew):'等待更新',step===3);
      if(step>=1)svg+=text(38,205,'下一状态的动作值：4 与 3','v-small')+text(38,239,`Q-learning 取 max = 4`,'v-small');
      if(step>=2)svg+=text(365,205,`δ = ${fmt(target)} − 2 = ${fmt(tdError)}`,'v-small');
      if(step>=3)svg+=text(365,239,`Q ← 2 + ${fmt(alpha)} × ${fmt(tdError)}`,'v-small');
      if(step>=4)svg+=text(38,292,`Q-learning ${fmt(qNew)}   /   SARSA ${fmt(sarsaNew)}   /   终止 ${fmt(terminalNew)}`,'v-title');
      const descriptions=[
        '假设已存储的 Q(s,a)=2，这次经验获得奖励 1 并到达非终止状态 s′。我们仅更新被访问的 (s,a)；这不是把整个价值表都重新求解。',
        'Q-learning 的下一步目标用 max Q(s′,·)，本例是 4，因此目标为 1+0.9×4=4.6。目标仍包含当前估计，不是已经知道的真实最优回报。',
        'TD 误差是目标与旧值之差：δ=4.6−2=2.6。正误差表明这条经验要求提高当前价值；它不是分类错误率，也不是当前一步奖励。',
        `只移动目标差距的 α 比例：新值是 2+${fmt(alpha)}×2.6=${fmt(qNew)}。α=0.5 时得到 3.3；α=1 会直接采用当前自举目标，但不意味着学习过程已经收敛。`,
        `如果实际选择的下一动作值是 3，SARSA 的目标是 3.7，新值 ${fmt(sarsaNew)}；若 s′ 已终止，则不自举，新值 ${fmt(terminalNew)}。三者使用同一条奖励，但目标定义不同。`
      ];
      return {svg,formula:'Q ← Q + α[r + γ maxₐ′Q(s′,a′) − Q]；终止时去掉自举项',body:descriptions[step],result:`Q-learning ${fmt(qNew)} · SARSA ${fmt(sarsaNew)} · 终止更新 ${fmt(terminalNew)}`,note:'这是社区补充的无模型一步更新；收敛还需要合适的访问覆盖与步长条件，不能由单步数值保证。',metrics:{oldQ,target,tdError,qNew,sarsaTarget,sarsaNew,terminalNew}};
    }
  };
  C['cs229-19']={name:'Q-learning、SARSA 与终止目标：只改一个条件',instructions:['先手算三种目标，说明 max 和实际下一动作的差异。','修改 alpha，检查新值是否按目标差距插值。','将 terminal=true，确认不再加入下一状态价值。'],expected:'默认 Q-learning 新值 3.3，SARSA 新值 2.85，终止更新值 1.5；Q-learning 的目标 4.6、TD 误差 2.6。',code:`// 社区扩展：单条确定性经验，不模拟完整训练或探索过程。
const oldQ=2, reward=1, gamma=0.9, alpha=0.5;
const nextQ=[4,3], chosenNextAction=1;
const qTarget=reward+gamma*Math.max(...nextQ);
const sarsaTarget=reward+gamma*nextQ[chosenNextAction];
const qNew=oldQ+alpha*(qTarget-oldQ);
const sarsaNew=oldQ+alpha*(sarsaTarget-oldQ);
const terminalNew=oldQ+alpha*(reward-oldQ);
console.log({qTarget,tdError:qTarget-oldQ,qNew,sarsaTarget,sarsaNew,terminalNew});
const terminal=false; // 改为 true：下一状态价值必须忽略
const target=reward+(terminal?0:gamma*Math.max(...nextQ));
console.log({terminal,target,updated:oldQ+alpha*(target-oldQ)});`};

  function hmm(p00){
    const pi=[.6,.4],transition=[[p00,1-p00],[.4,.6]],emit1=[.5,.1],emit2=[.1,.6];
    const alpha1=pi.map((p,i)=>p*emit1[i]);
    const alpha2=[0,1].map(j=>emit2[j]*sum(alpha1.map((p,i)=>p*transition[i][j])));
    const paths=[];for(let i=0;i<2;i++)for(let j=0;j<2;j++)paths.push({states:[i,j],probability:alpha1[i]*transition[i][j]*emit2[j]});
    const best=paths.reduce((a,b)=>a.probability>b.probability?a:b);
    return {alpha1,alpha2,sequenceProbability:sum(alpha2),best,paths,transition};
  }
  V['cs229-20']={
    title:'HMM：求和找总概率，取最大值找最佳路径',
    param:'转移概率 P(z₂=0 | z₁=0)',min:.1,max:.9,step:.05,value:.7,
    steps:['初始分布与第一项观测','把概率沿边传递','前向算法汇总路径','Viterbi 保留最优前驱','比较总概率与单条路径'],
    render(step,p00){
      const r=hmm(p00),x=[155,480],y=[120,245];
      let svg=frame('π=[0.6,0.4]；e(o₁)=[0.5,0.1]；e(o₂)=[0.1,0.6]','第二行转移固定为 [0.4,0.6]；调节第一行时仍保持概率和为 1。');
      for(let i=0;i<2;i++)for(let j=0;j<2;j++){
        const chosen=step>=3&&r.best.states[0]===i&&r.best.states[1]===j;
        if(step>=1)svg+=arrow(x[0]+61,y[i],x[1]-62,y[j],chosen?'v-yellow':'v-edge');
      }
      for(let i=0;i<2;i++){
        svg+=node(x[0]-60,y[i]-31,120,`z₁=${i}`,`α₁=${fmt(r.alpha1[i])}`,step===0);
        svg+=node(x[1]-60,y[i]-31,120,`z₂=${i}`,step>=2?`α₂=${fmt(r.alpha2[i],4)}`:'待汇总',step===2);
      }
      if(step>=1)svg+=text(290,101,`P₀₀=${fmt(p00,2)}`,'v-small')+text(290,279,'P₁₁=0.60','v-small');
      if(step>=2)svg+=text(575,120,`总概率`,'v-small')+text(575,150,fmt(r.sequenceProbability,4),'v-title');
      if(step>=3)svg+=text(575,218,`最佳 ${r.best.states.join('→')}`,'v-small')+text(575,248,fmt(r.best.probability,4),'v-title');
      const bodies=[
        '第一步把初始概率乘上当前观测的发射概率：α₁=[0.6×0.5,0.4×0.1]=[0.3,0.04]。它们是带观测的联合概率，不需要强制归一化为后验概率。',
        `从第一列每个状态沿转移边传播概率，再乘第二次观测的发射概率。当前从状态 0 出发的转移行为 [${fmt(p00)},${fmt(1-p00)}]；这保证了你改变的仍是一个有效模型。`,
        `前向算法对所有到达同一状态的路径求和，得到 α₂=[${r.alpha2.map(v=>fmt(v,4)).join(',')} ]。再把末尾状态求和，观测序列概率为 ${fmt(r.sequenceProbability,4)}。`,
        `Viterbi 在每个终点保留概率最大的前驱，并保存回溯指针。黄色边是本例整体最佳路径 ${r.best.states.join('→')}；它的联合概率为 ${fmt(r.best.probability,4)}。`,
        `当前所有路径的概率之和 ${fmt(r.sequenceProbability,4)}，大于或等于最大单条路径 ${fmt(r.best.probability,4)}。默认参数下分别为 0.091 与 0.054；“最可能的一条”不能替代“所有可能的总和”。`
      ];
      return {svg,formula:step>=3?'前向：αₜ(j)=eⱼ(oₜ)Σᵢαₜ₋₁(i)Aᵢⱼ；Viterbi：Σ → max':'α₂(j)=eⱼ(o₂)Σᵢ α₁(i)Aᵢⱼ',body:bodies[step],result:`P(o₁,o₂) ${fmt(r.sequenceProbability,4)} · 最大路径 ${fmt(r.best.probability,4)}`,note:'这是长度为 2 的完整枚举校验；长序列使用动态规划，并用缩放或对数运算避免下溢。',metrics:{alpha10:r.alpha1[0],alpha11:r.alpha1[1],alpha20:r.alpha2[0],alpha21:r.alpha2[1],sequenceProbability:r.sequenceProbability,viterbiProbability:r.best.probability,bestStart:r.best.states[0],bestEnd:r.best.states[1]}};
    }
  };
  C['cs229-20']={name:'HMM：动态规划与四条路径穷举交叉验证',instructions:['先计算两次前向向量，注意它们是联合概率。','修改 p00，观察最佳路径是否会切换。','比较穷举的和/最大值与前向/Viterbi，防止把 sum 与 max 混用。'],expected:'默认 α₁=[0.3,0.04]、α₂=[0.0226,0.0684]；序列概率 0.091，Viterbi 路径 0→1，概率 0.054。',code:`const p00=0.7;
const pi=[0.6,0.4], A=[[p00,1-p00],[0.4,0.6]];
const emission=[[0.5,0.1],[0.1,0.6]]; // 每个时刻对应观测的发射概率
const alpha1=pi.map((p,i)=>p*emission[0][i]);
const alpha2=[0,1].map(j=>emission[1][j]*alpha1.reduce((s,p,i)=>s+p*A[i][j],0));
const delta2=[0,1].map(j=>emission[1][j]*Math.max(...alpha1.map((p,i)=>p*A[i][j])));
const paths=[];
for(let i=0;i<2;i++)for(let j=0;j<2;j++) paths.push({path:[i,j],probability:alpha1[i]*A[i][j]*emission[1][j]});
const total=paths.reduce((s,p)=>s+p.probability,0);
const best=paths.reduce((a,b)=>a.probability>b.probability?a:b);
console.log({alpha1,alpha2,sequenceProbability:alpha2[0]+alpha2[1],delta2,viterbi:best});
if(Math.abs(total-alpha2[0]-alpha2[1])>1e-12)throw Error('前向结果与枚举求和不一致');
if(Math.abs(best.probability-Math.max(...delta2))>1e-12)throw Error('Viterbi与枚举最大值不一致');`};

  V['cs229-21']={
    title:'Gaussian 条件化：观察后，均值和不确定性怎样改变？',
    param:'观测噪声方差 σ²',min:.05,max:2,step:.05,value:.25,
    steps:['两个函数值的联合先验','加入带噪声的观测','更新条件均值','缩小潜在函数方差','区分函数与新观测'],
    render(step,noiseVariance){
      const rho=.8,y=1,posteriorMean=rho*y/(1+noiseVariance),latentVariance=1-rho*rho/(1+noiseVariance),observationVariance=latentVariance+noiseVariance;
      const px=z=>55+(z+3)/6.5*380,py=d=>272-d*250;
      const gaussian=(z,mu,v)=>Math.exp(-((z-mu)**2)/(2*v))/Math.sqrt(2*Math.PI*v);
      const xs=Array.from({length:111},(_,i)=>-3+6.5*i/110);
      let svg=frame('K = [[1,0.8],[0.8,1]]；观测 y₁ = 1','一个训练点和一个测试点的高斯过程，是二元高斯条件化。');
      svg+=line(55,272,435,272,'v-axis')+text(63,299,'−3','v-small')+text(px(0),299,'0','v-small v-center')+text(423,299,'3.5','v-small');
      svg+=polyline(xs.map(x=>[px(x),py(gaussian(x,0,1))]),'v-contour');
      if(step>=2)svg+=polyline(xs.map(x=>[px(x),py(gaussian(x,posteriorMean,latentVariance))]),'v-trail')+line(px(posteriorMean),272,px(posteriorMean),py(gaussian(posteriorMean,posteriorMean,latentVariance)),'v-yellow');
      if(step>=4)svg+=polyline(xs.map(x=>[px(x),py(gaussian(x,posteriorMean,observationVariance))]),'v-yellow');
      svg+=text(476,102,'先验：均值 0，方差 1','v-small');
      if(step>=1)svg+=text(476,140,`Var(y₁) = ${fmt(1+noiseVariance)}`,'v-small');
      if(step>=2)svg+=text(476,180,`条件均值 ${fmt(posteriorMean)}`,'v-title');
      if(step>=3)svg+=text(476,219,`潜在函数方差 ${fmt(latentVariance)}`,'v-small');
      if(step>=4)svg+=text(476,258,`新观测方差 ${fmt(observationVariance)}`,'v-small');
      const bodies=[
        '先验给 f₁ 和 f* 各自单位方差，协方差为 0.8。蓝线画出测试函数值 f* 的边缘先验 N(0,1)；核函数决定了观测一个点能为另一个点提供多少信息。',
        `观测值 y₁=f₁+ε，ε 的方差是 ${fmt(noiseVariance)}，因此 Var(y₁)=1+σ²=${fmt(1+noiseVariance)}。不能把带噪声的观测当成完全精确的函数值。`,
        `条件均值用协方差权衡观测：0.8×1/(1+σ²)=${fmt(posteriorMean)}。增大噪声会减弱这条观测的影响，均值更接近先验的零。`,
        `潜在函数方差是 1−0.8²/(1+σ²)=${fmt(latentVariance)}。绿线是观察后的 f* 分布；它保留的不确定性来自测试点与观测点并非完全相同。`,
        `如果要预测一次新的带噪声观测 y*=f*+ε*，还需再加测试噪声方差。这里假设训练和测试噪声相同，得到 ${fmt(observationVariance)}。黄线比潜在函数后验更宽。`
      ];
      return {svg,formula:'μ*=0.8/(1+σ²)；Var(f*|y₁)=1−0.64/(1+σ²)；Var(y*|y₁)=Var(f*|y₁)+σ²',body:bodies[step],result:`均值 ${fmt(posteriorMean)} · 潜在方差 ${fmt(latentVariance)} · 观测方差 ${fmt(observationVariance)}`,note:'σ² 表示方差；图中蓝色为先验、绿色为潜在函数后验、黄色为新观测分布。较小模型方差仍依赖核与噪声假设成立。',metrics:{noiseVariance,posteriorMean,latentVariance,observationVariance}};
    }
  };
  C['cs229-21']={name:'一观测点 GP：手算后验均值与两种预测方差',instructions:['先区分 σ²、标准差、潜在函数方差与观测方差。','将 noiseVariance 改成 1，解释均值为何更靠近零。','将 rho 改成 0，检查观察 y₁ 是否还能改变 f* 的先验。'],expected:'rho=0.8、noiseVariance=0.25、y=1 时，均值 0.64，潜在函数方差 0.488，新观测方差 0.738。',code:`const rho=0.8, noiseVariance=0.25, y=1;
if(Math.abs(rho)>1||noiseVariance<0)throw Error('协方差/噪声参数无效');
const priorVariance=1;
const observedVariance=priorVariance+noiseVariance;
const posteriorMean=rho*y/observedVariance;
const latentVariance=priorVariance-rho*rho/observedVariance;
const observationVariance=latentVariance+noiseVariance; // 假设测试噪声与训练噪声相同
console.log({posteriorMean,latentVariance,observationVariance});
console.log({latentSD:Math.sqrt(latentVariance),observationSD:Math.sqrt(observationVariance)});
if(latentVariance<-1e-12)throw Error('方差不能为负');
// 一个训练点的矩阵逆在这里就是除以 observedVariance；多点时应做稳定的矩阵求解。`};

  function classification(threshold){
    const positives=[.95,.9,.85,.8,.75,.7,.65,.6,.45,.25];
    const negatives=[.9,.8,.7,.55,...Array.from({length:86},(_,i)=>.05+.4*i/85)];
    const TP=positives.filter(p=>p>=threshold).length,FN=positives.length-TP,FP=negatives.filter(p=>p>=threshold).length,TN=negatives.length-FP;
    const accuracy=(TP+TN)/100,precision=TP+FP?TP/(TP+FP):0,recall=TP/10,cost=5*FN+FP;
    return {TP,FN,FP,TN,accuracy,precision,recall,cost};
  }
  V['cs229-22']={
    title:'项目交付：同一个模型，换阈值会付出什么代价？',
    param:'判为阳性的阈值 τ',min:.1,max:.9,step:.05,value:.5,
    steps:['固定评估集与成功标准','按阈值形成混淆矩阵','比较准确率、查准率与召回率','把错误换成业务成本','监控与隐私需要额外证据'],
    render(step,threshold){
      const m=classification(threshold);
      let svg=frame('100 条合成样本：10 个阳性，90 个阴性','模型分数保持不变；规则为 score ≥ τ 时预测阳性。');
      svg+=text(202,90,'预测 +','v-small v-center')+text(344,90,'预测 −','v-small v-center')+text(36,151,'实际 +','v-small')+text(36,244,'实际 −','v-small');
      const cells=[[135,108,'TP',m.TP],[277,108,'FN',m.FN],[135,201,'FP',m.FP],[277,201,'TN',m.TN]];
      cells.forEach(([x,y,label,n])=>svg+=rect(x,y,125,77,(label==='FN'&&step===3)?'v-node active':'v-node')+text(x+62,y+25,label,'v-center v-small')+text(x+62,y+57,step>=1?String(n):'?', 'v-center v-title'));
      if(step>=2)svg+=text(463,123,`Accuracy ${(m.accuracy*100).toFixed(1)}%`,'v-small')+text(463,160,`Precision ${(m.precision*100).toFixed(1)}%`,'v-small')+text(463,197,`Recall ${(m.recall*100).toFixed(1)}%`,'v-small');
      if(step>=3)svg+=text(463,242,`成本 5×FN + FP = ${m.cost}`,'v-title');
      if(step>=4)svg+=text(463,282,'性能报告 ≠ 隐私证明','v-small');
      const bodies=[
        '评估集固定为 10 个阳性与 90 个阴性，所有分数也是固定合成值。先约定“阳性”的业务含义，再选择指标。本页调节的是决策阈值，没有重新训练模型。',
        `当前 τ=${fmt(threshold,2)}，得到 TP=${m.TP}、FN=${m.FN}、FP=${m.FP}、TN=${m.TN}。降低阈值通常会同时减少漏报并增加误报，不是免费提升所有指标。`,
        `准确率为 ${(m.accuracy*100).toFixed(1)}%，但它受到多数类比例影响。查准率询问“报出的阳性有多少是真的”，召回率询问“真实阳性找回了多少”。默认阈值对应 94%、66.7%、80%。`,
        `假设一次漏报成本为 5、一次误报成本为 1，总成本为 5×${m.FN}+${m.FP}=${m.cost}。阈值应在验证集上按预先约定的目标选定，不能反复利用最终测试集调参后仍声称独立评估。`,
        '部署后还需按时间和子群监控分布漂移，并定义何时停止或回退。这个混淆矩阵没有说明训练记录是否被泄露，也不能推导差分隐私的 ε、δ；性能评估和隐私保证是两项独立证据。'
      ];
      return {svg,formula:'Precision=TP/(TP+FP)；Recall=TP/(TP+FN)；Cost=5FN+FP',body:bodies[step],result:`TP/FN/FP/TN = ${m.TP}/${m.FN}/${m.FP}/${m.TN} · 成本 ${m.cost}`,note:'合成数据用于演示阈值选择；调参应使用验证集，最终测试集只用于既定方案的评估。此实验不提供任何形式的隐私保证。',metrics:{threshold,...m}};
    }
  };
  C['cs229-22']={name:'项目评估：阈值、混淆矩阵和不对称错误成本',instructions:['先从 TP8/FN2/FP4/TN86 算出三个指标。','把 threshold 改为 0.45、0.7，观察漏报与误报。','写下一个监控或回退规则，并说明为何指标高仍不能证明隐私安全。'],expected:'threshold=0.5 时 TP8、FN2、FP4、TN86；accuracy=0.94、precision=2/3、recall=0.8，成本为 14。',code:`const positives=[.95,.9,.85,.8,.75,.7,.65,.6,.45,.25];
const negatives=[.9,.8,.7,.55,...Array.from({length:86},(_,i)=>.05+.4*i/85)];
const threshold=0.5;
const TP=positives.filter(p=>p>=threshold).length, FN=positives.length-TP;
const FP=negatives.filter(p=>p>=threshold).length, TN=negatives.length-FP;
const accuracy=(TP+TN)/(TP+FN+FP+TN);
const precision=TP+FP ? TP/(TP+FP) : 0;
const recall=TP/(TP+FN), cost=5*FN+FP;
console.log({threshold,TP,FN,FP,TN,accuracy,precision,recall,cost});
if(TP+FN!==10||FP+TN!==90)throw Error('评估集大小发生意外变化');
// 阈值在验证集上选；固定后再报告测试集。以上数字不能证明任何差分隐私保证。`};
})();
