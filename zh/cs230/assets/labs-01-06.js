/* CS230 foundations: explicit experiments, not a course-wide fallback. */
(() => {
'use strict';
const {text,line,arrow,node,rect,point,fmt}=window.MLVis;
const V=window.COURSE_VISUALS ||= {}, C=window.COURSE_CODE ||= {};
const title=s=>text(26,28,s,'v-title');
const bar=(x,y,w,value,color='#50dfc2')=>rect(x,y,w,16,'v-node',3)+`<rect x="${x}" y="${y}" width="${Math.max(0,Math.min(w,w*value))}" height="16" rx="3" fill="${color}"/>`;
const labels=[0,0,1,1,0,1];
function subjectSplit(k){const train=labels.slice(0,k),test=labels.slice(k),prediction=Number(train.reduce((a,b)=>a+b,0)>k/2);return {trainSubjects:k,testSubjects:6-k,prediction,leakyOverlap:6,groupOverlap:0,leakyAccuracy:1,groupedAccuracy:test.filter(y=>y===prediction).length/test.length};}
V['cs230-01']={title:'评价的是新帧，还是从未见过的人？',param:'完整保留在训练集的主体数',min:2,max:5,step:1,value:4,steps:['以主体定义部署目标','按帧切分产生身份重叠','改成按主体划分','比较记忆基线的成绩'],render(step,k){
 const m=subjectSplit(k);let svg=title('六位主体，每人两帧；目标是预测新主体')+text(26,67,'A、B、E 的标签为 0；C、D、F 为 1。','v-small');
 labels.forEach((y,i)=>{const x=30+i*119,grouped=step>=2;svg+=node(x,88,106,`${'ABCDEF'[i]} / y=${y}`,grouped?(i<k?'两帧：训练':'两帧：测试'):'帧1训 / 帧2测',grouped&&i<k);if(!grouped)svg+=text(x+53,180,'同一身份重叠','v-center v-small');});
 if(step>=1)svg+=text(35,220,'按帧：测试身份重叠 6 / 6，记忆器准确率 100%');
 if(step>=2)svg+=text(35,253,`按主体：测试身份重叠 0 / ${m.testSubjects}，未知主体预测 ${m.prediction}`);
 if(step>=3)svg+=bar(35,277,420,m.groupedAccuracy)+text(480,292,`新主体准确率 ${fmt(m.groupedAccuracy*100,1)}%`,'v-title');
 const bodies=['假设部署时遇到没有训练记录的新主体。每人两帧的标签相同，因此样本总数12不等于12个独立身份。先确定部署单位，才知道划分应阻断什么关联。','若把每人的第一帧训练、第二帧测试，测试集六位身份全部在训练集中出现。一个仅记住身份标签的模型也能得到100%，但它没有学习对新主体有用的规律。',`现在前 ${k} 位主体的两帧全部进入训练集，其余主体全部测试。身份重叠为0。对未知身份，玩具模型只返回训练集多数类；平票按0处理。`,`训练多数类为 ${m.prediction}。在 ${m.testSubjects} 位新主体上，记忆器准确率仅 ${fmt(m.groupedAccuracy*100,1)}%。这不是任何真实模型的性能估计，而是一个证明“错误划分能奖励记忆”的反例。`];
 return {svg,metrics:m,formula:'身份重叠 = |train_ID ∩ test_ID|；Accuracy = 正确预测主体数 / 测试主体数',body:bodies[step],result:`按帧 ${fmt(m.leakyAccuracy*100)}% · 按主体 ${fmt(m.groupedAccuracy*100)}% · 身份重叠 ${m.groupOverlap}`,note:'合成数据、身份记忆基线。无泄漏划分是必要检查，不能单独证明数据代表真实部署。'};
}};
C['cs230-01']={name:'拆开12张图片：检查主体泄漏',instructions:['运行按帧切分，确认测试主体集合与训练完全重叠。','将 trainSubjects 从4改成5，解释新主体测试准确率为什么变为0。','将测试目标改成“已有主体的新帧”，说明评价问题本身发生了什么改变。'],expected:'默认按帧重叠6、准确率1；按主体重叠0、训练4位/测试2位、准确率0.5。',code:`const labels=[0,0,1,1,0,1], trainSubjects=4;
const records=labels.flatMap((label,id)=>[0,1].map(frame=>({id,frame,label})));
function evaluate(train,test){
 const memory=new Map(train.map(r=>[r.id,r.label]));
 const fallback=Number(train.reduce((sum,r)=>sum+r.label,0)>train.length/2);
 const trainIds=new Set(train.map(r=>r.id)),testIds=new Set(test.map(r=>r.id));
 const overlap=[...testIds].filter(id=>trainIds.has(id)).length;
 const accuracy=test.filter(r=>(memory.has(r.id)?memory.get(r.id):fallback)===r.label).length/test.length;
 return {overlap,accuracy,trainSubjects:trainIds.size,testSubjects:testIds.size};
}
console.log({rowSplit:evaluate(records.filter(r=>r.frame===0),records.filter(r=>r.frame===1)),
 groupSplit:evaluate(records.filter(r=>r.id<trainSubjects),records.filter(r=>r.id>=trainSubjects))});`};

const xorX=[[0,0],[0,1],[1,0],[1,1]],xorY=[0,1,1,0];
function xorModel(c){const outputs=xorX.map(x=>Math.max(0,x[0]+x[1])-c*Math.max(0,x[0]+x[1]-1));return {outputs,predictions:outputs.map(y=>Number(y>=.5)),accuracy:outputs.filter((y,i)=>Number(y>=.5)===xorY[i]).length/4};}
V['cs230-02']={title:'两个 ReLU 怎样折出 XOR 的表示？',param:'第二隐藏单元的减去系数 c',min:0,max:3,step:.25,value:2,steps:['先看四个输入与标签','第一单元计算和','第二单元截去超过1的部分','组合成非线性输出'],render(step,c){
 const m=xorModel(c);let svg=title('h1 = ReLU(x1+x2)，h2 = ReLU(x1+x2−1)');
 svg+=line(70,270,285,270,'v-axis')+line(70,270,70,70,'v-axis')+text(290,274,'x1','v-small')+text(55,64,'x2','v-small');
 xorX.forEach((x,i)=>{const px=90+x[0]*170,py=245-x[1]*145;svg+=`<circle cx="${px}" cy="${py}" r="15" fill="${xorY[i]?'#50dfc2':'#ffe38a'}"/>`+text(px,py+5,String(xorY[i]),'v-center v-node-title');if(step>=3)svg+=text(px,py+38,`f=${fmt(m.outputs[i],2)}`,'v-center v-small');});
 svg+=node(355,65,170,'h1',step>=1?'[0,1,1,2]':'等待前向',step===1)+node(355,173,170,'h2',step>=2?'[0,0,0,1]':'等待前向',step===2);
 if(step>=3)svg+=arrow(530,98,571,151)+arrow(530,206,571,171)+node(580,130,150,'h1 − c·h2',`c = ${fmt(c,2)}`,true)+text(380,292,`阈值 0.5：正确 ${Math.round(m.accuracy*4)} / 4`,'v-title');
 const bodies=['四个角的标签是0、1、1、0。正类位于相对的两个角，单条直线无法把它们与另外两个角分开。我们现在手工构造隐藏表示，暂时不执行训练。','第一单元输出输入之和，因为这四个输入的和都非负，所以h1=[0,1,1,2]。只看这个表示，两个正例得分1，但(1,1)的负例反而得分2。','第二单元只有在输入和超过1时才开启，得到h2=[0,0,0,1]。它提供一条折点，使后续线性组合能单独修正(1,1)。',`组合后输出 [${m.outputs.map(x=>fmt(x,2)).join(', ')}]，以0.5为阈值得到准确率 ${fmt(m.accuracy*100,1)}%。c=2时正好得到XOR；换掉ReLU后，多层仿射映射仍可合并，不能产生同样的折点。`];
 return {svg,metrics:m,formula:'f(x)=ReLU(x1+x2)−c·ReLU(x1+x2−1)；预测=1[f≥0.5]',body:bodies[step],result:`f=[${m.outputs.join(', ')}] · 准确率=${fmt(m.accuracy)}`,note:'手工权重展示表示能力，不表示优化器一定能从任意初始化找到这些权重。'};
}};
C['cs230-02']={name:'XOR：隐藏层改变可分性',instructions:['计算四个输入经过两个ReLU后的隐藏表示。','把 coefficient 从2改成0，看哪一个角被分错。','将两个Math.max去掉，对照无非线性网络的输出。'],expected:'默认outputs=[0,1,1,0]，accuracy=1。coefficient=0时只有(1,1)分错，accuracy=0.75。',code:`const inputs=[[0,0],[0,1],[1,0],[1,1]],labels=[0,1,1,0],coefficient=2;
const hidden=inputs.map(([a,b])=>[Math.max(0,a+b),Math.max(0,a+b-1)]);
const outputs=hidden.map(([h1,h2])=>h1-coefficient*h2);
const predictions=outputs.map(score=>Number(score>=0.5));
const accuracy=predictions.filter((value,i)=>value===labels[i]).length/labels.length;
console.log({hidden,outputs,predictions,accuracy});`};

function branchGradient(w){const x=2,z=w*x,p=z*z,q=3*z,prediction=p+q,error=prediction-1,loss=.5*error*error,pathSquare=error*2*z*x,pathLinear=error*3*x;const f=v=>.5*((v*x)**2+3*v*x-1)**2,epsilon=1e-5;return {z,p,q,prediction,error,loss,pathSquare,pathLinear,analytic:pathSquare+pathLinear,numeric:(f(w+epsilon)-f(w-epsilon))/(2*epsilon)};}
V['cs230-03']={title:'同一参数走两条路：反向时必须相加',param:'共享权重 w',min:.1,max:1,step:.1,value:.5,steps:['共享节点的前向值','两条路径合成预测','分别回传局部贡献','累加并对照中心差分'],render(step,w){
 const m=branchGradient(w);let svg=title('z = 2w；预测 = z² + 3z；L = ½(预测−1)²');
 svg+=node(28,125,140,'共享 z',fmt(m.z),step===0)+node(250,63,150,'平方路径 z²',fmt(m.p),step===2)+node(250,194,150,'线性路径 3z',fmt(m.q),step===2)+node(560,125,170,'合流与损失',`L = ${fmt(m.loss)}`,step===1);
 svg+=arrow(175,147,242,105)+arrow(175,169,242,217)+arrow(406,104,550,145)+arrow(406,219,550,169);
 if(step>=2)svg+=text(365,50,`∂L/∂w：${fmt(m.pathSquare)}`,'v-small')+text(365,283,`∂L/∂w：${fmt(m.pathLinear)}`,'v-small');
 if(step>=3)svg+=text(30,310,`解析 ${fmt(m.analytic,6)} = 两支相加；中心差分 ${fmt(m.numeric,6)}`,'v-title');
 const bodies=[`w=${fmt(w)}、x=2，因此共享节点z=${fmt(m.z)}。z同时送入平方支路与线性支路；前向缓存一个值，反向却要接收两项贡献。`,`两条支路输出 ${fmt(m.p)} 和 ${fmt(m.q)}，预测为 ${fmt(m.prediction)}。目标为1，残差 ${fmt(m.error)}，含1/2的平方损失为 ${fmt(m.loss)}。`,`平方支路给出(预测−1)·2z·2=${fmt(m.pathSquare)}，线性支路给出(预测−1)·3·2=${fmt(m.pathLinear)}。两者都是对同一w的影响，不能相乘或只保留一项。`,`累加得到 ${fmt(m.analytic,6)}。用ε=10⁻⁵分别扰动同一参数再做完整前向，中心差分为 ${fmt(m.numeric,6)}。只扰动一条支路会验证另一个函数，因此不能称为原模型的梯度检查。`];
 return {svg,metrics:m,formula:'∂L/∂w = (z²+3z−1)(2z+3)·2 = 路径平方贡献 + 路径线性贡献',body:bodies[step],result:`梯度 ${fmt(m.analytic,6)} · 数值 ${fmt(m.numeric,6)} · 绝对差 ${Math.abs(m.analytic-m.numeric).toExponential(2)}`,note:'固定输入、双精度中心差分。有限差分只作调试验证，训练时不会对每个参数这样计算。'};
}};
C['cs230-03']={name:'共享参数：漏掉一条梯度路径会怎样？',instructions:['分别写出平方与线性支路对w的贡献。','把analytic故意改为pathSquare，观察与数值梯度的差异。','尝试epsilon=1e-2和1e-8，比较截断误差与舍入误差。'],expected:'w=0.5时loss=4.5；两支贡献12与18，解析梯度30，中心差分约30。',code:`const w=0.5,x=2,target=1,epsilon=1e-5;
const forward=weight=>{const z=weight*x;return 0.5*(z*z+3*z-target)**2;};
const z=w*x,prediction=z*z+3*z,error=prediction-target;
const pathSquare=error*2*z*x,pathLinear=error*3*x;
const analytic=pathSquare+pathLinear;
const numeric=(forward(w+epsilon)-forward(w-epsilon))/(2*epsilon);
console.log({z,prediction,loss:forward(w),pathSquare,pathLinear,analytic,numeric,absoluteError:Math.abs(analytic-numeric)});`};

function adamFirst(beta1){const gradient=[2,.2],beta2=.999,alpha=.1,epsilon=1e-8,firstMoment=gradient.map(g=>(1-beta1)*g),secondMoment=gradient.map(g=>(1-beta2)*g*g),correctedFirst=firstMoment.map(m=>m/(1-beta1)),correctedSecond=secondMoment.map(v=>v/(1-beta2)),updates=gradient.map((_,i)=>alpha*correctedFirst[i]/(Math.sqrt(correctedSecond[i])+epsilon)),uncorrected=gradient.map((_,i)=>alpha*firstMoment[i]/(Math.sqrt(secondMoment[i])+epsilon));return {firstMoment,secondMoment,correctedFirst,correctedSecond,updates,uncorrected,sgd:gradient.map(g=>alpha*g)};}
V['cs230-04']={title:'Adam 的第一次更新：为什么要做偏差校正？',param:'一阶矩平滑系数 β1',min:0,max:.95,step:.05,value:.9,steps:['固定同一条二维梯度','从零累计一阶与二阶矩','除去初始化引入的缩小','比较三种实际步长'],render(step,beta1){
 const m=adamFirst(beta1);let svg=title('首步 g=[2,0.2]，α=0.1，β2=0.999，ε=10⁻⁸');
 ['坐标1','坐标2'].forEach((label,i)=>{const y=80+i*100;svg+=text(28,y,label)+text(100,y,`g=${[2,.2][i]}`);if(step>=1)svg+=text(210,y,`m=${fmt(m.firstMoment[i],4)}`)+text(390,y,`v=${fmt(m.secondMoment[i],6)}`);if(step>=2)svg+=text(210,y+35,`m̂=${fmt(m.correctedFirst[i],2)}`,'v-small')+text(390,y+35,`v̂=${fmt(m.correctedSecond[i],2)}`,'v-small');});
 if(step>=3){svg+=text(590,76,'坐标1 / 坐标2','v-small')+text(590,115,`SGD ${fmt(m.sgd[0])} / ${fmt(m.sgd[1])}`,'v-small')+text(590,155,`Adam ${fmt(m.updates[0])} / ${fmt(m.updates[1])}`,'v-small')+text(590,195,'未校正首步','v-small')+text(590,225,`${fmt(m.uncorrected[0])} / ${fmt(m.uncorrected[1])}`,'v-small');svg+=text(28,292,'相同学习率不代表相同的参数移动距离','v-title');}
 const bodies=['这里只比较收到同一梯度后的更新，不把三个优化器各自训练的不同轨迹混在一起。两个坐标梯度相差10倍，SGD首步的移动也相差10倍。',`m0=v0=0。首次平滑把梯度缩小为(1−β1)g，其中β1=${fmt(beta1,2)}；二阶矩缩为(1−0.999)g²。此时原始m、v不是已经充分积累的矩估计。`,`首步分别除以1−β1与1−β2，得到m̂=g、v̂=g²。因此正梯度的更新约等于α，只有分母ε造成极小偏差。`, `校正Adam的两坐标步长约为0.1；SGD为0.2和0.02。若省略偏差校正，当前首步约为${fmt(m.uncorrected[0],6)}。改变β1会改变未校正值，但首步校正结果保持不变；之后多步的结果仍会依赖β1。`];
 return {svg,metrics:m,formula:'m̂₁=m₁/(1−β1)；v̂₁=v₁/(1−β2)；Δθ=αm̂₁/(√v̂₁+ε)',body:bodies[step],result:`Adam Δ=[${m.updates.map(v=>fmt(v,6))}] · 未校正=[${m.uncorrected.map(v=>fmt(v,6))}]`,note:'展示减去的步长幅度；不是证明Adam在此问题上更优。多步、不同坐标符号和权重衰减需另行比较。'};
}};
C['cs230-04']={name:'Adam 首步：把每项偏差校正展开',instructions:['先算两个坐标的m、v，再用对应校正因子还原矩。','把beta1改成0.5，验证哪些首步数值保持不变。','比较sgd与updates，说明同学习率为什么仍不等于同一步长。'],expected:'m=[0.2,0.02]，v=[0.004,0.00004]；校正后的更新约[0.1,0.1]，未校正约[0.316228,0.316227]。',code:`const gradient=[2,0.2],beta1=0.9,beta2=0.999,alpha=0.1,epsilon=1e-8;
const firstMoment=gradient.map(g=>(1-beta1)*g),secondMoment=gradient.map(g=>(1-beta2)*g*g);
const correctedFirst=firstMoment.map(m=>m/(1-beta1)),correctedSecond=secondMoment.map(v=>v/(1-beta2));
const updates=gradient.map((_,i)=>alpha*correctedFirst[i]/(Math.sqrt(correctedSecond[i])+epsilon));
const uncorrected=gradient.map((_,i)=>alpha*firstMoment[i]/(Math.sqrt(secondMoment[i])+epsilon));
const sgd=gradient.map(g=>alpha*g);
console.log({firstMoment,secondMoment,correctedFirst,correctedSecond,updates,uncorrected,sgd});`};

function batchNorm(x){const batch=[1,x],mean=(1+x)/2,variance=batch.reduce((s,v)=>s+(v-mean)**2,0)/2,epsilon=1e-5,gamma=2,beta=-1,runningMean=0,runningVariance=4;return {batch,mean,variance,trainOutputs:batch.map(v=>gamma*(v-mean)/Math.sqrt(variance+epsilon)+beta),evalOutputs:batch.map(v=>gamma*(v-runningMean)/Math.sqrt(runningVariance+epsilon)+beta)};}
V['cs230-05']={title:'BatchNorm：相同权重，训练与推理仍可输出不同',param:'批次中第二条激活 x',min:-1,max:7,step:.5,value:3,steps:['从当前批次计算统计量','训练时用批次统计归一化','推理使用固定累计统计','同一输入走两种状态'],render(step,x){
 const m=batchNorm(x);let svg=title(`批次 [1,${fmt(x,1)}]；γ=2，β=−1，ε=10⁻⁵`);
 svg+=node(28,122,145,'原始激活',`[1, ${fmt(x,1)}]`,step===0)+node(280,62,220,'训练：当前批次',`μ=${fmt(m.mean)}，v=${fmt(m.variance)}`,step===1)+node(280,198,220,'推理：累计统计','μ_run=0，v_run=4',step===2)+arrow(180,145,272,102)+arrow(180,168,272,226);
 if(step>=1)svg+=node(560,62,175,'训练输出',m.trainOutputs.map(v=>fmt(v,3)).join(', '),step===3)+arrow(506,95,551,95);
 if(step>=2)svg+=node(560,198,175,'推理输出',m.evalOutputs.map(v=>fmt(v,3)).join(', '),step===3)+arrow(506,231,551,231);
 const bodies=[`当前批次为[1,${fmt(x,1)}]，均值${fmt(m.mean)}，按1/B计算的批次方差${fmt(m.variance)}。实验固定γ=2、β=−1，专门比较统计来源，不调整模型权重。`,`训练模式先减当前均值，再除以√(方差+ε)，最后应用γ与β。当默认批次是[1,3]时，归一化结果近似[−1,1]，仿射变换后近似[−3,1]。`,`推理模式不从这两条输入重新估计统计量，而读取固定累计均值0、方差4。默认输入3得到2×3/√(4+ε)−1≈2，与训练输出约1不同。累计统计在本例中直接给定，未演示其更新规则。`,`训练输出为[${m.trainOutputs.map(v=>fmt(v,5))}]，推理为[${m.evalOutputs.map(v=>fmt(v,5))}]。将第二条激活改成1时，批次方差为0；ε让除法有限，训练输出都等于β=−1。推理仍使用原来的累计统计。`];
 return {svg,metrics:m,formula:'训练：γ(x−μ_batch)/√(v_batch+ε)+β；推理：γ(x−μ_run)/√(v_run+ε)+β',body:bodies[step],result:`μ_batch=${fmt(m.mean)} · v_batch=${fmt(m.variance)} · x的推理输出=${fmt(m.evalOutputs[1],6)}`,note:'采用训练前向的有偏批次方差。框架累计方差的估计约定可能不同；这里固定累计值，避免将两种约定混为一谈。'};
}};
C['cs230-05']={name:'检查 train / eval 的数值差别',instructions:['先用[1,3]手算批次均值2和方差1。','将batch改为[1,1]，检查epsilon如何处理零方差。','保持参数不变，分别使用当前批次和固定累计统计，解释输出差异。'],expected:'默认trainOutputs≈[-2.999990,0.999990]；evalOutputs≈[-0.00000125,1.99999625]。',code:`const batch=[1,3],gamma=2,beta=-1,epsilon=1e-5;
const mean=batch.reduce((s,x)=>s+x,0)/batch.length;
const variance=batch.reduce((s,x)=>s+(x-mean)**2,0)/batch.length;
const runningMean=0,runningVariance=4;
const normalize=(x,mu,v)=>gamma*(x-mu)/Math.sqrt(v+epsilon)+beta;
const trainOutputs=batch.map(x=>normalize(x,mean,variance));
const evalOutputs=batch.map(x=>normalize(x,runningMean,runningVariance));
console.log({mean,variance,trainOutputs,evalOutputs});`};

function epochReplay(seed){let state=seed>>>0;const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};const shuffle=()=>{const a=Array.from({length:8},(_,id)=>({id,label:id%2}));for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};const first=shuffle(),savedState=state,second=shuffle();state=savedState;const restored=shuffle();state=seed>>>0;const restarted=shuffle();return {first:first.map(r=>r.id),second:second.map(r=>r.id),restored:restored.map(r=>r.id),restarted:restarted.map(r=>r.id),savedState,replayMatches:second.every((r,i)=>r.id===restored[i].id),restartMatches:second.every((r,i)=>r.id===restarted[i].id),labelsAligned:[...first,...second,...restored].every(r=>r.label===r.id%2)};}
V['cs230-06']={title:'可复现不只是一个种子：恢复随机数状态',param:'初始随机种子',min:1,max:99,step:1,value:42,steps:['固定带标签的记录','确定性洗牌第一轮','保存边界状态并继续','恢复状态与重新设种子的区别'],render(step,seed){
 const m=epochReplay(seed);let svg=title('8条记录，label=id mod 2；整条记录一起洗牌');
 const row=(y,label,ids,color)=>{let s=text(27,y+20,label,'v-small');ids.forEach((id,i)=>{const x=196+i*62;s+=`<rect x="${x}" y="${y}" width="46" height="35" rx="5" fill="${color}"/>`+text(x+23,y+23,String(id),'v-center v-node-title');});return s;};
 svg+=row(62,'第一轮',step>=1?m.first:[0,1,2,3,4,5,6,7],'#294a5d');
 if(step>=2)svg+=row(127,'继续第二轮',m.second,'#247766')+text(27,113,`边界PRNG状态：${m.savedState}`,'v-small');
 if(step>=3)svg+=row(190,'恢复状态',m.restored,'#247766')+row(252,'只重设初始种子',m.restarted,'#775b2d');
 const bodies=['每条记录包含id与label，不分别打乱输入数组和标签数组。这里使用明确的32位线性同余发生器和Fisher–Yates洗牌，因而可以逐项复算，而不依赖Math.random。',`从种子${seed}开始，第一轮顺序为[${m.first.join(', ')}]。固定种子与算法可以重复这一轮；但这还不足以说明从训练中途如何继续。`,`完成第一轮洗牌后，保存PRNG内部状态${m.savedState}。继续产生第二轮得到[${m.second.join(', ')}]。真实训练还要保存模型、优化器、调度器以及数据迭代位置。`,`从保存的内部状态恢复，第二轮逐项匹配：${m.replayMatches?'是':'否'}。若只重新设置初始种子，将再次产生第一轮顺序，而不是继续原来的随机序列。本例展示epoch边界；若在批次中断，还必须保存当前排列与游标。`];
 return {svg,metrics:m,formula:'state ← (1664525·state + 1013904223) mod 2³²；u = state/2³²',body:bodies[step],result:`恢复匹配=${m.replayMatches} · 仅重设种子匹配=${m.restartMatches} · 标签对齐=${m.labelsAligned}`,note:'确定性教学PRNG不用于密码学；真实框架、多进程、硬件内核还可能有其他随机或非确定性状态。'};
}};
C['cs230-06']={name:'中断数据迭代后，下一轮还能完全重放吗？',instructions:['运行并比较second与restored，确认逐项相同。','将恢复语句state=savedState改为state=seed，观察错误重启。','解释若在一轮的中间保存，还需要额外记录哪些数据管线状态。'],expected:'seed=42时保存PRNG内部状态后恢复可逐项重现第二轮；只重设初始种子会重复第一轮。',code:`const seed=42;let state=seed>>>0;
const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
function shuffle(){
 const records=Array.from({length:8},(_,id)=>({id,label:id%2}));
 for(let i=records.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[records[i],records[j]]=[records[j],records[i]];}
 return records;
}
const first=shuffle(),savedState=state,second=shuffle();
state=savedState;const restored=shuffle();
state=seed>>>0;const restarted=shuffle();
const ids=rows=>rows.map(row=>row.id);
console.log({first:ids(first),savedState,second:ids(second),restored:ids(restored),restarted:ids(restarted),
 replayMatches:second.every((r,i)=>r.id===restored[i].id),restartMatches:second.every((r,i)=>r.id===restarted[i].id),
 labelsAligned:[...first,...second,...restored].every(r=>r.label===r.id%2)});`};
})();
