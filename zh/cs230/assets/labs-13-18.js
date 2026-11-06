/* CS230 applications: independent small models, not substitutes for full training. */
(() => {
  'use strict';
  const {text,line,arrow,rect,node,point,fmt}=window.MLVis;
  const V=window.COURSE_VISUALS ||= {}, C=window.COURSE_CODE ||= {};
  const sigmoid=x=>1/(1+Math.exp(-x));
  const bar=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${color}"/>`;

  V['cs230-13']={title:'迁移学习：冻结的是哪一组参数？',param:'骨干学习率',min:0,max:.1,step:.01,value:.02,
    steps:['预训练骨干生成特征','反向计算两组梯度','分别更新头部与骨干','比较冻结与微调'],
    render(step,backboneLR){
      const x=3,target=4,a=2,w=.5,feature=a*x,prediction=w*feature,error=prediction-target;
      const gradientHead=error*feature,gradientBackbone=error*w*x,newHead=w-.02*gradientHead,newBackbone=a-backboneLR*gradientBackbone;
      const frozenPrediction=newHead*a*x,tunedPrediction=newHead*newBackbone*x,frozenLoss=.5*(frozenPrediction-target)**2,tunedLoss=.5*(tunedPrediction-target)**2;
      let svg=text(28,28,'同一个样本，两组参数，两种更新规则','v-title');
      svg+=node(30,60,110,'输入 x','3',step===0)+arrow(143,93,183,93)+node(195,60,145,'骨干 h=ax',`a=2，h=${feature}`,step===0)+arrow(344,93,384,93)+node(396,60,145,'头部 ŷ=wh','w=0.5，ŷ=3',step===0)+arrow(545,93,585,93)+node(597,60,133,'目标与误差','y=4，e=−1');
      if(step>=1)svg+=text(270,162,`∂L/∂a = ${fmt(gradientBackbone)}`,'v-center')+text(468,162,`∂L/∂w = ${fmt(gradientHead)}`,'v-center');
      if(step>=2)svg+=node(105,193,245,'冻结骨干',`a′=2；w′=${fmt(newHead)}`,false)+node(405,193,245,'微调骨干',`a′=${fmt(newBackbone)}；w′=${fmt(newHead)}`,true);
      if(step>=3)svg+=text(227,292,`ŷ=${fmt(frozenPrediction,4)}，L=${fmt(frozenLoss,6)}`,'v-center')+text(527,292,`ŷ=${fmt(tunedPrediction,4)}，L=${fmt(tunedLoss,6)}`,'v-center');
      const body=[
        '骨干把 x=3 映射为 h=2×3=6，头部给出 ŷ=0.5×6=3。真实目标为4，平方损失带1/2，因此残差e=−1，初始损失0.5。',
        '头部梯度 e·h=−6；骨干梯度 e·w·x=−1.5。冻结不表示骨干在数学上没有梯度，而是优化器不更新这组参数。两组梯度都由更新前参数计算。',
        `头部学习率固定0.02，故 w′=0.62。骨干学习率为${fmt(backboneLR,2)}，a′=2−η(−1.5)=${fmt(newBackbone)}。把滑杆设为0，即得到冻结策略。`,
        `冻结预测${fmt(frozenPrediction,4)}，微调预测${fmt(tunedPrediction,4)}。这只是一个样本的一步拟合；是否迁移有效，需要目标域独立验证，不能从这一次损失下降推出部署表现。`
      ];
      return {svg,formula:'L=½(wh−y)²，h=ax；∂L/∂w=e·h，∂L/∂a=e·w·x',body:body[step],result:`w′=${fmt(newHead)}；a′=${fmt(newBackbone)}；冻结L=${fmt(frozenLoss,6)}，微调L=${fmt(tunedLoss,6)}`,note:'标量两层网络用于展示参数组更新。头部学习率固定，滑杆只改变骨干学习率。',metrics:{gradientHead,gradientBackbone,newHead,newBackbone,frozenPrediction,tunedPrediction,frozenLoss,tunedLoss}};
    }};
  C['cs230-13']={name:'冻结与微调：比较同一梯度下的参数更新',instructions:['先用旧a、w手算两组梯度。','把backboneLR改为0，核对骨干完全不变。','扫描多个骨干学习率；思考单样本损失为什么不足以选择上线策略。'],expected:'默认 w′=0.62、a′=2.03；冻结预测3.72、损失0.0392；微调预测3.7758、损失0.02513282。',code:`const x=3,target=4,backbone=2,head=.5;
const headLR=.02,backboneLR=.02;
const feature=backbone*x,error=head*feature-target;
// 两组梯度都使用同一份旧参数，不混入刚更新的头部。
const gradientHead=error*feature,gradientBackbone=error*head*x;
const newHead=head-headLR*gradientHead,newBackbone=backbone-backboneLR*gradientBackbone;
const frozenPrediction=newHead*backbone*x,tunedPrediction=newHead*newBackbone*x;
console.log({gradientHead,gradientBackbone,newHead,newBackbone,frozenPrediction,tunedPrediction,
 frozenLoss:.5*(frozenPrediction-target)**2,tunedLoss:.5*(tunedPrediction-target)**2});`};

  V['cs230-14']={title:'GAN：逼真度之外，还要覆盖两种模式',param:'生成分布中 A 的概率',min:.05,max:.95,step:.05,value:.2,
    steps:['固定真实分布','改变生成分布','求当前最优判别器','用整体分布检查覆盖'],
    render(step,q){
      const p=[.8,.2],g=[q,1-q],discriminator=p.map((v,i)=>v/(v+g[i]));
      const midpoint=p.map((v,i)=>(v+g[i])/2);
      const js=.5*p.reduce((s,v,i)=>s+v*Math.log(v/midpoint[i]),0)+.5*g.reduce((s,v,i)=>s+v*Math.log(v/midpoint[i]),0);
      const objective=p.reduce((s,v,i)=>s+v*Math.log(discriminator[i])+g[i]*Math.log(1-discriminator[i]),0);
      let svg=text(28,28,'两个离散模式：真实频率与生成频率','v-title')+line(60,258,405,258,'v-axis');
      ['A','B'].forEach((label,i)=>{const x=110+i*170;svg+=bar(x,258-p[i]*185,46,p[i]*185,'#62a7ef')+text(x+23,250-p[i]*185,fmt(p[i],2),'v-center v-small')+text(x+50,286,label,'v-center');if(step>=1)svg+=bar(x+53,258-g[i]*185,46,g[i]*185,'#50dfc2')+text(x+76,250-g[i]*185,fmt(g[i],2),'v-center v-small');});
      svg+=text(65,62,'蓝：真实 p；绿：生成 q','v-small');
      if(step>=2)svg+=text(458,100,`D*(A)=${fmt(discriminator[0])}`)+text(458,142,`D*(B)=${fmt(discriminator[1])}`);
      if(step>=3)svg+=text(458,194,`JS(p,q)=${fmt(js,6)}`)+text(458,235,`V(D*,G)=${fmt(objective,6)}`)+text(458,282,'q=p 时 D*=1/2，JS=0','v-small');
      const body=['真实数据只含两个模式A、B，概率分别0.8与0.2。评价的是整个分布，不能只挑A中的几张漂亮样本。',`生成器给A分配${fmt(q,2)}，给B分配${fmt(1-q,2)}。两类样本本身都可能合法，但频率错误仍意味着覆盖与真实数据不一致。`,'固定生成器后，对每个模式最大化 p·log D+q·log(1−D)，导数为p/D−q/(1−D)。令其为零，得到D*=p/(p+q)。',`将最优判别器代回，V(D*,G)=−ln4+2JS(p||q)=${fmt(objective,6)}。q(A)=0.8时两分布相等，判别器只能给0.5。这里的求解是离散精确基准，不代表神经GAN训练一定达到这个解。`];
      return {svg,formula:'D*(x)=p(x)/(p(x)+q(x))；V(D*,G)=−ln4+2JS(p||q)',body:body[step],result:`D*=[${discriminator.map(v=>fmt(v)).join(', ')}]；JS=${fmt(js,6)}；目标=${fmt(objective,6)}`,note:'蓝绿柱分别是概率质量，使用自然对数。生成分布学习与扰动已有输入的对抗攻击是两类问题。',metrics:{generated:g,discriminator,js,objective}};
    }};
  C['cs230-14']={name:'两点 GAN：独立求解最优判别器与分布差异',instructions:['先计算A、B各自的最优判别概率。','将qA从0.2改为0.8；检查D*、JS与目标的变化。','把qA设为0.05，解释少量模式样本看起来正确为何仍不够。'],expected:'默认 D*=[0.8,0.2]，JS≈0.192744757，V≈−1.000804847；qA=0.8时JS=0、V=−ln4。',code:`const real=[.8,.2],qA=.2,generated=[qA,1-qA];
const discriminator=real.map((p,i)=>p/(p+generated[i]));
const mixture=real.map((p,i)=>(p+generated[i])/2);
const kl=(p,q)=>p.reduce((s,v,i)=>s+(v===0?0:v*Math.log(v/q[i])),0);
const js=(kl(real,mixture)+kl(generated,mixture))/2;
const objective=real.reduce((s,p,i)=>s+p*Math.log(discriminator[i])+generated[i]*Math.log(1-discriminator[i]),0);
console.log({generated,discriminator,js,objective,identityError:objective-(-Math.log(4)+2*js)});`};

  V['cs230-15']={title:'积分梯度：解释分数也依赖参考基线',param:'参考基线的第一坐标 b',min:0,max:2,step:.25,value:0,
    steps:['选择输入和参考点','沿直线路径积分梯度','检查归因之和','改变基线再解释'],
    render(step,b){
      const attribution=[3-b,3+b],gradientTimesInput=[6,6],total=6,px=x=>85+x*90,py=y=>265-y*85;
      let svg=text(28,28,'模型 f(x₁,x₂)=x₁x₂，待解释输入(3,2)','v-title')+line(65,265,400,265,'v-axis')+line(85,65,85,285,'v-axis');
      svg+=point(px(b),py(0),7)+text(px(b)+8,py(0)-12,`基线(${fmt(b,2)},0)`,'v-small')+point(px(3),py(2),7)+text(px(3)-6,py(2)-16,'输入(3,2)','v-end v-small');
      if(step>=1){svg+=arrow(px(b),py(0),px(3),py(2),'v-teal');for(let t=.2;t<1;t+=.2)svg+=point(px(b+(3-b)*t),py(2*t),3,'v-history');}
      if(step>=2){svg+=text(455,88,`IG₁ = 3−b = ${fmt(attribution[0])}`)+bar(455,104,attribution[0]*36,22,'#62a7ef')+text(455,168,`IG₂ = 3+b = ${fmt(attribution[1])}`)+bar(455,184,attribution[1]*36,22,'#50dfc2')+text(455,247,'归因和 = 6 = f(x)−f(基线)');}
      if(step>=3)svg+=text(85,310,'改变基线，归因分配改变；预测 f(3,2)=6 不变。','v-small');
      const body=[`当前预测是3×2=6，参考输入为(${fmt(b,2)},0)，其预测是0。解释的对象是这两个输出之差，不是没有参考条件的“绝对贡献”。`,`直线路径是(b+(3−b)t,2t)。沿路径，偏导分别为2t和b+(3−b)t；对t从0积到1，再乘对应输入变化量，得到IG₁=3−b、IG₂=3+b。`,`两项之和始终为6，符合积分梯度的完整性。直接用端点梯度乘输入则得到[6,6]、总和12；对含交互项的函数，它不等于输出差。`,`当前分配为[${attribution.map(v=>fmt(v)).join(', ')}]。把b从0改到1，归因从[3,3]改成[2,4]，虽然预测没变。完整性是数学性质，不证明这两项是现实世界的因果效应。`];
      return {svg,formula:'IGᵢ=(xᵢ−bᵢ)∫₀¹ ∂f(b+t(x−b))/∂xᵢ dt；IG=[3−b,3+b]',body:body[step],result:`IG=[${attribution.map(v=>fmt(v)).join(', ')}]；和=${total}；端点梯度×输入的和=12`,note:'乘积函数有特征交互。本例只解释模型函数；没有建立真实数据生成过程的因果模型。',metrics:{baseline:[b,0],attribution,total,gradientTimesInput,outputDifference:6}};
    }};
  C['cs230-15']={name:'积分梯度：用数值积分验证完整性和基线依赖',instructions:['先推导两个解析归因，不要只看最后的和。','将baselineFirst改为1，观察预测不变而归因变化。','用端点gradient×input与积分结果比较，指出交互项造成的差别。'],expected:'baselineFirst=0时IG=[3,3]；改成1则为[2,4]。两次都加和为6；端点梯度×输入=[6,6]。',code:`const input=[3,2],baselineFirst=0,baseline=[baselineFirst,0],steps=1000;
const delta=input.map((x,i)=>x-baseline[i]);
const integral=[0,0];
for(let k=0;k<steps;k++){
 const t=(k+.5)/steps; // 中点积分；本例路径偏导为一次函数。
 const at=baseline.map((b,i)=>b+t*delta[i]);
 const gradient=[at[1],at[0]];
 for(let i=0;i<2;i++)integral[i]+=gradient[i]/steps;
}
const attribution=integral.map((v,i)=>v*delta[i]);
const outputDifference=input[0]*input[1]-baseline[0]*baseline[1];
console.log({attribution,total:attribution[0]+attribution[1],outputDifference,
 gradientTimesInput:[input[1]*input[0],input[0]*input[1]]});`};

  V['cs230-16']={title:'外部验证：总体下降可能来自病例构成',param:'外院阳性病例中老年比例',min:.1,max:.9,step:.1,value:.8,
    steps:['固定两组内的灵敏度','查看源医院病例构成','换成外院病例构成','用共同权重标准化'],
    render(step,olderFraction){
      const rates=[.95,.6],sourceCounts=[160,40],externalCounts=[200*(1-olderFraction),200*olderFraction];
      const sourceDetected=sourceCounts.reduce((s,n,i)=>s+n*rates[i],0),externalDetected=externalCounts.reduce((s,n,i)=>s+n*rates[i],0);
      const sourceSensitivity=sourceDetected/200,externalSensitivity=externalDetected/200,standardizedSensitivity=(rates[0]+rates[1])/2;
      let svg=text(28,28,'每院200例已知阳性病例；组内性能保持相同','v-title');
      svg+=text(40,66,'年轻组 TPR=95%','v-small')+text(290,66,'老年组 TPR=60%','v-small');
      const cohort=(y,label,counts,detected)=>{let out=text(40,y-12,label);out+=bar(40,y,counts[0]*2.1,32,'#62a7ef')+bar(40+counts[0]*2.1,y,counts[1]*2.1,32,'#50dfc2');out+=text(40,y+55,`年轻 ${fmt(counts[0],0)}；老年 ${fmt(counts[1],0)}`,'v-small')+text(500,y+23,`检出 ${fmt(detected,1)} / 200`);return out;};
      if(step>=1)svg+=cohort(100,'源医院',sourceCounts,sourceDetected);
      if(step>=2)svg+=cohort(207,'外部医院',externalCounts,externalDetected);
      if(step>=3)svg+=text(40,313,`统一按年轻/老年各50%加权：两院均 ${fmt(standardizedSensitivity*100,1)}%`,'v-small');
      const body=['只比较确诊阳性病例的检出率：年轻组95%，老年组60%。两组中的条件性能固定，以隔离病例构成变化的影响；这里没有阴性样本，不能计算特异度或阳性预测值。','源院200例阳性病例中，年轻160例、老年40例，期望检出160×0.95+40×0.60=176例，总体灵敏度88%。',`外院老年比例${fmt(olderFraction*100,0)}%，期望检出${fmt(externalDetected,1)}例，总体灵敏度${fmt(externalSensitivity*100,1)}%。组内性能没变，总分也可能下降；总分变化本身不足以定位失败机制。`,'统一用50%年轻、50%老年的参考构成，两院标准化灵敏度都是0.5×0.95+0.5×0.60=77.5%。同时保留实际构成下的指标，因为它对应当地真实工作量，标准化不能取代外部验证。'];
      return {svg,formula:'TPR总体=Σ组权重×TPR组；TPR标准化=0.5×0.95+0.5×0.60=0.775',body:body[step],result:`源院${fmt(sourceSensitivity*100,1)}%；外院${fmt(externalSensitivity*100,1)}%；共同标准${fmt(standardizedSensitivity*100,1)}%`,note:'全部为合成阳性病例的期望计数。实际研究还要报告阴性病例、患病比例、置信区间和工作流结果。',metrics:{sourceCounts,externalCounts,sourceDetected,externalDetected,sourceSensitivity,externalSensitivity,standardizedSensitivity}};
    }};
  C['cs230-16']={name:'医院外部验证：拆开组内表现与病例构成',instructions:['先计算两个医院各自的总检出数。','调整externalOlderFraction，但保持组内灵敏度固定。','比较实际权重与共同权重；说明为什么两种结果都应报告。'],expected:'默认源院检出176/200=88%；外院134/200=67%。两院以相同50/50构成标准化后都是77.5%。',code:`const groupSensitivity=[.95,.60],sourceCounts=[160,40];
const externalOlderFraction=.8;
const externalCounts=[200*(1-externalOlderFraction),200*externalOlderFraction];
const summarize=counts=>{
 const detected=counts.reduce((sum,n,i)=>sum+n*groupSensitivity[i],0);
 return {counts,detected,sensitivity:detected/counts.reduce((a,b)=>a+b,0)};
};
const source=summarize(sourceCounts),external=summarize(externalCounts);
const commonWeights=[.5,.5];
const standardizedSensitivity=groupSensitivity.reduce((s,tpr,i)=>s+commonWeights[i]*tpr,0);
console.log({source,external,standardizedSensitivity});
console.log('仅有阳性病例：不能据此计算特异度、阳性预测值或临床效益。');`};

  V['cs230-17']={title:'策略梯度：基线改变方差，不改变期望方向',param:'回报基线 b',min:0,max:4,step:.25,value:2,
    steps:['策略给两个动作分配概率','回报减去共同基线','分别计算采样梯度','取期望并更新一次'],
    render(step,baseline){
      const probability=.5,gradientA=(3-baseline)*(1-probability),gradientB=(1-baseline)*(-probability);
      const expectedGradient=probability*gradientA+(1-probability)*gradientB,variance=probability*(gradientA-expectedGradient)**2+(1-probability)*(gradientB-expectedGradient)**2;
      const newTheta=.1*gradientA,newProbability=sigmoid(newTheta),expectedRewardBefore=2,expectedRewardAfter=1+2*newProbability;
      let svg=text(28,28,'单步两动作环境：r(A)=3，r(B)=1','v-title')+node(30,104,155,'策略 logit θ','θ=0，p(A)=0.5',step===0)+arrow(190,130,290,89)+arrow(190,146,290,220);
      svg+=node(300,55,180,'动作 A','概率0.5，回报3',step===0)+node(300,187,180,'动作 B','概率0.5，回报1',step===0);
      if(step>=1)svg+=text(515,82,`优势 3−b=${fmt(3-baseline)}`,'v-small')+text(515,214,`优势 1−b=${fmt(1-baseline)}`,'v-small');
      if(step>=2)svg+=text(515,114,`gA=${fmt(gradientA)}`)+text(515,246,`gB=${fmt(gradientB)}`);
      if(step>=3)svg+=text(35,294,`E[g]=${fmt(expectedGradient)}；Var(g)=${fmt(variance)}；抽到A后 p′=${fmt(newProbability,6)}`,'v-small');
      const body=['p(A)=σ(θ)，初始θ=0，所以两个动作各有一半概率。期望回报J=3p+1(1−p)=1+2p，对θ的精确导数为2p(1−p)=0.5。',`REINFORCE用(r−b)∂logπ(a)/∂θ。这里基线b=${fmt(baseline)}在选动作前固定，对两个动作相同，且更新时不对基线求导。`,`抽到A时，score为1−p=0.5，gA=${fmt(gradientA)}；抽到B时，score为−p=−0.5，gB=${fmt(gradientB)}。某次样本梯度可能与真实改进方向相反。`,`按动作概率平均，E[g]=0.5始终不变，方差为${fmt(variance)}。若这次抽到A，以步长0.1更新θ，得到p′=${fmt(newProbability,6)}。本例b=2恰好消除方差，不意味着任意任务都能找到零方差基线。`];
      return {svg,formula:'g=(r−b)∇θlogπ(a)；E[g]=∇θJ=2p(1−p)；θ′=θ+0.1g',body:body[step],result:`gA=${fmt(gradientA)}，gB=${fmt(gradientB)}；E[g]=0.5；方差=${fmt(variance)}`,note:'单步bandit与标量logit用于隔离策略梯度机制，未执行深度网络或长期轨迹训练。',metrics:{probability,gradientA,gradientB,expectedGradient,variance,newTheta,newProbability,expectedRewardBefore,expectedRewardAfter}};
    }};
  C['cs230-17']={name:'REINFORCE：枚举动作验证基线的无偏性',instructions:['先用J=1+2σ(θ)直接求精确梯度。','将baseline分别改为0、2、4，比较期望与方差。','观察抽到A的单次更新；解释单次梯度变差为何不等于估计有偏。'],expected:'默认 gA=gB=0.5、期望0.5、方差0；θ′=0.05、p′≈0.512497。b=0时gA=1.5、gB=−0.5，方差1。',code:`const theta=0,baseline=2,learningRate=.1;
const sigmoid=z=>1/(1+Math.exp(-z)),probability=sigmoid(theta);
const gradientA=(3-baseline)*(1-probability),gradientB=(1-baseline)*(-probability);
const expectedGradient=probability*gradientA+(1-probability)*gradientB;
const exactGradient=2*probability*(1-probability);
const variance=probability*(gradientA-expectedGradient)**2+(1-probability)*(gradientB-expectedGradient)**2;
// 只演示一次抽到A的更新，不把单次梯度当成总体保证。
const newTheta=theta+learningRate*gradientA,newProbability=sigmoid(newTheta);
console.log({gradientA,gradientB,expectedGradient,exactGradient,variance,newTheta,newProbability,
 expectedRewardBefore:1+2*probability,expectedRewardAfter:1+2*newProbability});`};

  V['cs230-18']={title:'项目验收：配对消融不能只展示最好一次',param:'纳入的配对种子数',min:2,max:5,step:1,value:5,
    steps:['按同一随机种子配对','逐对计算分数差','计算均值与标准误','报告区间与适用条件'],
    render(step,count){
      const n=Math.round(count),base=[80,82,81,79,83].slice(0,n),full=[81,84,80,81,85].slice(0,n),differences=full.map((x,i)=>x-base[i]);
      const mean=differences.reduce((s,x)=>s+x,0)/n,sampleVariance=differences.reduce((s,x)=>s+(x-mean)**2,0)/(n-1),standardError=Math.sqrt(sampleVariance/n),critical={2:12.706,3:4.303,4:3.182,5:2.776}[n];
      const lower=mean-critical*standardError,upper=mean+critical*standardError;
      let svg=text(28,28,'固定数据与预算，比较五次配对消融','v-title')+text(45,65,'基线','v-small')+text(235,65,'加入组件','v-small')+text(365,65,'差值 / 百分点','v-small');
      for(let i=0;i<n;i++){const y=95+i*39;svg+=point(80,y,5)+text(100,y+5,String(base[i]));svg+=point(280,y,5,'v-history')+text(300,y+5,String(full[i]));if(step>=1)svg+=line(135,y,265,y,'v-edge')+text(405,y+5,`${differences[i]>0?'+':''}${differences[i]}`,'v-center');}
      if(step>=2)svg+=text(500,95,`均值 ${fmt(mean,3)} pp`)+text(500,138,`标准误 ${fmt(standardError,4)}`)+text(500,179,`df=${n-1}，t*=${critical}`,'v-small');
      if(step>=3){const px=x=>510+(x+6)*13;svg+=line(px(-6),235,px(9),235,'v-axis')+line(px(0),215,px(0),255,'v-axis')+line(px(lower),235,px(upper),235,'v-yellow')+point(px(mean),235,6)+text(500,284,`95% CI [${fmt(lower,2)}, ${fmt(upper,2)}]`,'v-small');}
      const body=[`取前${n}组配对种子。每对使用相同划分与预算，分数单位是百分数。配对设计的目标是减少共同实验条件造成的变动。`,'逐对减去对应基线，五组完整差值为[1,2,−1,2,2]个百分点。第三次性能下降，不能因为不好看就删掉这一对，也不能把两个独立的最高分相减。',`当前均值${fmt(mean,3)}个百分点，样本方差用n−1分母，为${fmt(sampleVariance,4)}；均值标准误为s/√n=${fmt(standardError,4)}。种子数增多不保证每次均值都上升。`,`用df=${n-1}的双侧t临界值${critical}，区间为[${fmt(lower,3)},${fmt(upper,3)}]个百分点。它包含0；这组证据不足以宣称稳定提升。该区间依赖独立配对差值及近似正态等假设，不覆盖测试集抽样、数据选择或调参的全部不确定性。`];
      return {svg,formula:'dᵢ=score完整−score基线；SE=s_d/√n；CI=d̄ ± t_(n−1,0.975)·SE',body:body[step],result:`n=${n}；均值=${fmt(mean,3)} pp；95% CI=[${fmt(lower,3)}, ${fmt(upper,3)}] pp`,note:'五组固定合成实验，t临界值取三位小数。区间只描述此配对设计下的种子变动；同时检查匹配计算预算。',metrics:{n,differences,mean,sampleVariance,standardError,critical,lower,upper}};
    }};
  C['cs230-18']={name:'配对消融：报告每个种子、效应和区间',instructions:['先写出每一对分数差，保留负提升。','将seedCount设为2、3、4、5，比较区间宽度。','解释这个区间为什么不能代替对新患者、新地区或新数据集的评估。'],expected:'5对差值[1,2,−1,2,2] pp；均值1.2 pp、样本方差1.7、SE≈0.583095，95%区间约[−0.418672,2.818672] pp。',code:`const baseline=[80,82,81,79,83],withComponent=[81,84,80,81,85],seedCount=5;
const differences=withComponent.slice(0,seedCount).map((score,i)=>score-baseline[i]);
const n=differences.length,mean=differences.reduce((a,b)=>a+b,0)/n;
const sampleVariance=differences.reduce((s,d)=>s+(d-mean)**2,0)/(n-1);
const standardError=Math.sqrt(sampleVariance/n),critical={2:12.706,3:4.303,4:3.182,5:2.776}[n];
if(!critical)throw new Error('教学例子支持2到5个配对种子');
const lower=mean-critical*standardError,upper=mean+critical*standardError;
console.log({n,differences,mean,sampleVariance,standardError,critical,lower,upper});
console.log('区间包含0？',lower<=0&&upper>=0,'；单位是百分点，不是相对百分比。');`};
})();
