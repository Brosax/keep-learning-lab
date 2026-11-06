/* CS230 07–12: six distinct mechanisms, with small inspectable numerical models. */
(() => {
  'use strict';
  const {text,line,arrow,rect,node,point,fmt}=window.MLVis;
  const V=window.COURSE_VISUALS ||= {}, C=window.COURSE_CODE ||= {};
  const colors=['#62b4ee','#50dfc2','#ffe38a','#e99476'];
  const bar=(x,y,width,value,label,color='#50dfc2')=>`${text(x,y-8,label,'v-small')}<rect x="${x}" y="${y}" width="${width}" height="15" fill="#172337" rx="3"/><rect x="${x}" y="${y}" width="${Math.max(0,width*value)}" height="15" fill="${color}" rx="3"/>`;

  V['cs230-07']={title:'backward 会相加：什么时候清零，什么时候除以批数？',param:'学习率 α',min:.05,max:.5,step:.05,value:.1,steps:['固定参数计算两个微批','把均值梯度累积到同一缓冲区','更新一次，与未缩放比较','逐批更新时检查旧梯度污染'],render(step,alpha){
    const batchGradient=-2.5, accumulatedWeight=-alpha*batchGradient,unscaledWeight=5*alpha;
    const firstWeight=alpha,secondGradient=4*firstWeight-4;
    const cleanSequentialWeight=firstWeight-alpha*secondGradient;
    const staleWeight=firstWeight-alpha*(secondGradient-1);
    let svg=text(26,29,'两条样本：(x,y)=(1,1)、(2,2)；初始 w=0','v-title');
    svg+=node(30,64,190,'微批 1','原始梯度 −1',step===0)+node(30,166,190,'微批 2','原始梯度 −4',step===0);
    svg+=arrow(225,96,290,125)+arrow(225,198,290,155)+node(300,111,185,'梯度缓冲区',step===0?'等待累积':'−1/2 − 4/2 = −2.5',step===1);
    svg+=arrow(490,144,535,144)+node(550,111,180,'一次 step()',step>=2?`w = ${fmt(accumulatedWeight,4)}`:'参数尚未更新',step===2);
    if(step>=2)svg+=text(32,278,`漏除以 2：w=${fmt(unscaledWeight,4)}，有效步长翻倍`,'v-small');
    if(step===3)svg+=text(32,307,`逐批 step：清零 w=${fmt(cleanSequentialWeight,4)}；遗留旧梯度 w=${fmt(staleWeight,4)}`,'v-small');
    const bodies=[
      '使用 ℓ=½(wx−y)²，因此单样本梯度是 x(wx−y)。在同一个 w=0 处，两个梯度分别为 −1 与 −4；backward 只写入梯度缓冲区，并不自动修改 w。',
      '目标是两个样本损失的平均值。两个微批各只有一个样本，所以每个损失除以 2 再 backward，累积得到 −0.5−2=−2.5；这一阶段不调用 step，也不在两个微批之间清零。',
      `累计结束后只更新一次：w=0−${fmt(alpha,2)}×(−2.5)=${fmt(accumulatedWeight,4)}。若两次 backward 均未缩放，得到总和梯度 −5，新权重为 ${fmt(unscaledWeight,4)}。不等大小微批需按样本数加权，而不是盲目除以微批数。`,
      `另一种方案是每条样本后立即 step。第一步 w=${fmt(firstWeight,4)}，第二条样本的当前梯度为 ${fmt(secondGradient,4)}，清零后得到 ${fmt(cleanSequentialWeight,4)}；未清零会再加上旧梯度 −1，错误地得到 ${fmt(staleWeight,4)}。逐批更新与一次大批更新也不应被要求相等，因为第二个梯度的求值位置变了。`
    ];
    return {svg,formula:'∇w ℓᵢ=xᵢ(wxᵢ−yᵢ)；ḡ=(−1−4)/2=−2.5；w′=w−αḡ',body:bodies[step],result:`均值累积 ${fmt(accumulatedWeight,4)} · 未缩放 ${fmt(unscaledWeight,4)} · 逐批清零 ${fmt(cleanSequentialWeight,4)} · 未清零 ${fmt(staleWeight,4)}`,note:'JavaScript 复现梯度缓冲区语义；不是在浏览器执行 PyTorch。固定两条样本，未涉及 dropout 或 BatchNorm。',metrics:{alpha,batchGradient,accumulatedWeight,unscaledWeight,cleanSequentialWeight,staleWeight}};
  }};
  C['cs230-07']={name:'训练闭环：比较三种梯度缓冲区用法',instructions:['先写出两个样本在 w=0 处的梯度。','运行后比较均值累积、未缩放累积、逐批清零与不清零。','改变 alpha，解释为什么逐批更新通常不等于一次大批更新。'],expected:'α=.1：一次均值梯度更新 w=.25；未缩放为 .5；逐批清零为 .46；第二步遗留梯度为 .56。',code:`const samples=[[1,1],[2,2]], alpha=0.1;
const gradient=(w,[x,y])=>x*(w*x-y);
// 大批目标是样本平均损失；微批计算期间 w 固定。
let accumulated=0;
for(const sample of samples) accumulated+=gradient(0,sample)/samples.length;
const accumulatedWeight=-alpha*accumulated;
const unscaledWeight=-alpha*samples.reduce((g,s)=>g+gradient(0,s),0);
let clean=0, stale=0, buffer=0;
for(const sample of samples){
  clean-=alpha*gradient(clean,sample); // 每一步使用新梯度，不保留旧缓冲区。
  buffer+=gradient(stale,sample); // 刻意展示忘记 zero_grad 的错误。
  stale-=alpha*buffer;
}
console.log({alpha,batchGradient:accumulated,accumulatedWeight,unscaledWeight,
  cleanSequentialWeight:clean,staleWeight:stale});`};

  V['cs230-08']={title:'误差账本：最差切片不一定贡献最多错误',param:'修复罕见场景的错误数',min:0,max:10,step:1,value:4,steps:['记录每个切片的样本数','把错误数除以各自分母','换算对总体误差的贡献','估算一次定向修复的收益'],render(step,fixes){
    const names=['清晰场景','遮挡场景','罕见场景'],sizes=[50,30,20],errors=[5,9,10],after=[5,9,10-fixes];
    const beforeErrors=24,afterErrors=24-fixes,total=100,source=step===3?after:errors;
    let svg=text(26,29,'固定开发集 100 条；切片互斥且覆盖全部样本','v-title');
    svg+=text(30,65,'切片','v-small')+text(205,65,'样本 / 错误','v-small')+text(365,65,'切片错误率','v-small')+text(605,65,'总体贡献','v-small');
    source.forEach((e,i)=>{const y=100+i*62;svg+=text(30,y+14,names[i])+text(210,y+14,`${sizes[i]} / ${e}`)+bar(365,y,200,step>=1?e/sizes[i]:0,step>=1?`${fmt(100*e/sizes[i],1)}%`:'待计算',colors[i]);if(step>=2)svg+=text(620,y+14,`${e} pp`);});
    svg+=line(25,265,730,265,'v-axis');
    svg+=text(30,302,step===3?`总体：24% → ${afterErrors}%；绝对降低 ${fixes} 个百分点`:'总体误差 = 5/100 + 9/100 + 10/100 = 24%','v-title');
    const bodies=[
      '每条样本恰好属于一个切片：50 条清晰、30 条遮挡、20 条罕见。错误数分别为 5、9、10。先记录人数与错误数，再解释比率；不要只保存一个百分比。',
      '切片错误率分别为 5/50=10%、9/30=30%、10/20=50%。罕见场景最难，但50%使用的是20条样本这个分母，并不是整体系统有50%出错。',
      '总体误差贡献要除以统一分母100，三个贡献为5、9、10个百分点。它们可以相加成24%。重叠切片的贡献不能这样直接求和，应先去重或明确交集。',
      `假设只修复罕见切片的 ${fixes} 个错误且没有任何回退，整体错误变为 ${afterErrors}/100，罕见切片变为 ${10-fixes}/20。绝对降低 ${fixes} 个百分点，相对减少 ${fmt(100*fixes/24,2)}% 的原有错误。完全修好该切片的理论上限也只有10个百分点；这是预算估计，不是实际干预的效果证明。`
    ];
    return {svg,formula:'E总体 = Σg(n_g/N)E_g；Δ绝对 = 修复数/N；Δ相对 = 修复数/原错误数',body:bodies[step],result:`修复后总体 ${afterErrors}% · 罕见切片 ${fmt(100*(10-fixes)/20,1)}% · 相对错误减少 ${fmt(100*fixes/24,2)}%`,note:'示例假定切片互斥、只修复不新增错误。真实改动必须在冻结开发集上复测，并保留独立最终测试集。',metrics:{total,beforeErrors,afterErrors,beforeRate:.24,afterRate:afterErrors/100,sliceRate:(10-fixes)/20,absoluteGain:fixes/100,relativeReduction:fixes/24,maxGain:.10}};
  }};
  C['cs230-08']={name:'误差预算：把局部修复换算成整体收益',instructions:['比较每个切片的错误率和它对总体的贡献，两者分母不同。','将 fixes 从 4 改为 10，计算最乐观上限。','思考若一次修改新增其他切片错误，哪些假设需要修改。'],expected:'默认总错误 24→20，整体错误率 .24→.20；罕见切片 .50→.30；绝对降低 .04，相对降低 1/6。',code:`const slices=[{name:'清晰',n:50,errors:5},{name:'遮挡',n:30,errors:9},{name:'罕见',n:20,errors:10}];
const fixes=4;
if(!Number.isInteger(fixes)||fixes<0||fixes>slices[2].errors)throw Error('修复数必须是0到10的整数');
const total=slices.reduce((s,g)=>s+g.n,0),beforeErrors=slices.reduce((s,g)=>s+g.errors,0);
console.table(slices.map(g=>({...g,sliceRate:g.errors/g.n,overallContribution:g.errors/total})));
const afterErrors=beforeErrors-fixes;
console.log({total,beforeErrors,afterErrors,beforeRate:beforeErrors/total,afterRate:afterErrors/total,
  sliceRate:(slices[2].errors-fixes)/slices[2].n,absoluteGain:fixes/total,
  relativeReduction:fixes/beforeErrors,maxGain:slices[2].errors/total});`};

  V['cs230-09']={title:'分类结果相同，概率预测为什么仍有好坏？',param:'保留原置信度的比例 λ',min:0,max:1,step:.1,value:.5,steps:['固定标签与原始概率','向 0.5 收缩置信度','逐个计算平方概率误差','对比 Brier 与准确率'],render(step,retention){
    const original=[.9,.8,.6,.1],labels=[1,0,1,0],probabilities=original.map(p=>.5+retention*(p-.5));
    const brier=probabilities.reduce((s,p,i)=>s+(p-labels[i])**2,0)/4,originalBrier=.205;
    const accuracy=probabilities.filter((p,i)=>Number(p>=.5)===labels[i]).length/4,originalAccuracy=.75;
    let svg=text(26,29,'标签 y=[1,0,1,0]；同一阈值 0.5','v-title');
    for(let i=0;i<4;i++){const x=48+i*175,p=step===0?original[i]:probabilities[i];svg+=text(x,65,`样本 ${i+1} · y=${labels[i]}`,'v-small');svg+=line(x+48,100,x+48,240,'v-axis');svg+=`<rect x="${x+20}" y="${240-140*p}" width="56" height="${140*p}" fill="${colors[i]}" opacity=".8"/>`;svg+=line(x+10,170,x+85,170,'v-edge')+text(x+48,261,`p=${fmt(p,2)}`,'v-center');if(step>=2)svg+=text(x+48,290,`误差 ${fmt((p-labels[i])**2,4)}`,'v-center v-small');}
    const bodies=[
      '四个原始概率为0.9、0.8、0.6、0.1，标签为1、0、1、0。阈值0.5下，只有第二条预测错误，因此准确率为75%；但这个数字没有告诉我们第二条错误有多自信。',
      `保留系数 λ=${fmt(retention,1)} 时，p′=0.5+λ(p−0.5)，把概率沿直线移向0.5。λ=1保持原预测；λ=0全部变成0.5。这里先固定一个变换，评价概率质量，没有使用这四个测试标签拟合参数。`,
      `Brier 使用 (p′−y)²，再对样本取平均。四项分别为 ${probabilities.map((p,i)=>fmt((p-labels[i])**2,4)).join('、')}；平均为 ${fmt(brier,6)}。对错误且过度自信的预测，会产生更大惩罚。`,
      `当前 Brier=${fmt(brier,6)}，原始为0.205；准确率为${fmt(accuracy*100,0)}%，原始为75%。概率评分与阈值分类回答不同问题。小样本Brier更低不能单独证明总体校准更好；校准曲线还要报告分箱规则、样本量和不确定性。`
    ];
    return {svg,formula:'p′=0.5+λ(p−0.5)；Brier=(1/N)Σ(p′ᵢ−yᵢ)²；ŷ=1[p′≥0.5]',body:bodies[step],result:`Brier ${fmt(originalBrier,5)} → ${fmt(brier,5)} · Accuracy ${fmt(accuracy*100,0)}%`,note:'四条样本只演示评分机制，不构成校准评估。λ 应在独立验证集选择；这里明确规定 p=0.5 判为正类。',metrics:{retention,probabilities,brier,originalBrier,accuracy,originalAccuracy}};
  }};
  C['cs230-09']={name:'概率评价：Brier 能看到准确率忽略的变化',instructions:['先手算第二条错误预测的 Brier 项 .8²。','把 retention 改成 1、0.5、0，比较概率评分和阈值预测。','不要根据最终测试标签反复挑最优 retention；另留验证集。'],expected:'retention=.5 时概率 [.7,.65,.55,.3]，Brier=.20125（原 .205），准确率仍 .75。retention=0 时 Brier=.25，约定平局为正类，因此准确率 .5。',code:`const original=[0.9,0.8,0.6,0.1],labels=[1,0,1,0],retention=0.5;
const probabilities=original.map(p=>0.5+retention*(p-0.5));
const score=ps=>ps.reduce((sum,p,i)=>sum+(p-labels[i])**2,0)/ps.length;
const acc=ps=>ps.filter((p,i)=>Number(p>=0.5)===labels[i]).length/ps.length;
console.table(probabilities.map((p,i)=>({label:labels[i],before:original[i],after:p,squaredError:(p-labels[i])**2})));
console.log({retention,probabilities,brier:score(probabilities),originalBrier:score(original),
  accuracy:acc(probabilities),originalAccuracy:acc(original)});`};

  V['cs230-10']={title:'卷积窗口：共享权重，改变步幅会跳过哪些位置？',param:'步幅 stride',min:1,max:3,step:1,value:2,steps:['先补边界，再滑动窗口','第一个窗口逐项乘加','所有合法窗口共用同一组权重','核权重数量不随输出长度变化'],render(step,stride){
    const padded=[0,1,2,3,4,0],kernel=[1,0,-1],outputs=[];for(let start=0;start+3<=padded.length;start+=stride)outputs.push(kernel.reduce((s,k,j)=>s+k*padded[start+j],0));
    let svg=text(26,29,'一维输入 [1,2,3,4]，两侧补 0，核 [1,0,−1]','v-title');
    padded.forEach((value,i)=>{const x=47+i*105;svg+=rect(x,62,76,50,i===0||i===5?'v-node':'v-node active')+text(x+38,93,value,'v-center');});
    svg+=text(47,143,'首个窗口','v-small');
    if(step>=1){svg+=line(47,119,333,119,'v-yellow')+text(365,143,'0×1 + 1×0 + 2×(−1) = −2','v-small');}
    outputs.forEach((out,i)=>{const x=57+i*150;svg+=rect(x,189,112,54,step>=2?'v-node active':'v-node');svg+=text(x+56,222,step>=2?out:'?','v-center');if(step>=2)svg+=text(x+56,268,`起点 ${i*stride}`,'v-center v-small');});
    svg+=text(27,310,`输出长度 ${outputs.length} · 权重 3 + 偏置 1 = 4 个参数`,'v-title');
    const bodies=[
      '深度学习库通常把不翻转核的互相关也叫“卷积”。本例以一维序列代替图像来显式检查索引。补零后为[0,1,2,3,4,0]，核固定[1,0,−1]，偏置为0。',
      '第一个窗口始终从补齐数组起点0开始：[0,1,2] 与 [1,0,−1] 逐项相乘，得到0+0−2=−2。若把核翻转，符号会改变；实现与数学约定要一致。',
      `stride=${stride} 时，只使用起点 ${outputs.map((_,i)=>i*stride).join('、')}，输出为[${outputs.join(', ')}]。每次窗口必须完整落在补齐数组中，末尾不足一个核的位置不产生输出。`,
      `out=floor((4+2×1−3)/${stride})+1=${outputs.length}。输出长度随stride变化，但同一个核仍只有3个权重和1个偏置。多输入/输出通道时，参数数目还需乘上通道数；它并不等于输出单元数。`
    ];
    return {svg,formula:'out=floor((in+2p−k)/s)+1；yⱼ=Σₜ wₜ·xpad[j·s+t]+b',body:bodies[step],result:`stride=${stride} · 输出 [${outputs.join(', ')}] · 4 个共享参数`,note:'这是无膨胀的一维 cross-correlation。实际2D卷积还需分别计算宽高；边界补零会影响平移等变性。',metrics:{stride,outputLength:outputs.length,outputs,parameterCount:4}};
  }};
  C['cs230-10']={name:'卷积索引：不依赖框架的滑动窗口',instructions:['先手算补零后的第一与最后一个合法窗口。','将 stride 依次改为 1、2、3，比较输出长度与输出值。','翻转 kernel 后再运行，区分互相关与严格数学卷积。'],expected:'stride=2 得到 [-2,-2]；stride=1 得到 [-2,-2,-2,3]；stride=3 得到 [-2,3]。含偏置始终4个参数。',code:`const input=[1,2,3,4],kernel=[1,0,-1],padding=1,stride=2,bias=0;
const padded=[...Array(padding).fill(0),...input,...Array(padding).fill(0)];
const outputs=[];
for(let start=0;start+kernel.length<=padded.length;start+=stride){
  const window=padded.slice(start,start+kernel.length);
  const value=window.reduce((sum,x,i)=>sum+x*kernel[i],bias);
  outputs.push(value);
  console.log({start,window,value});
}
const outputLength=Math.floor((input.length+2*padding-kernel.length)/stride)+1;
if(outputs.length!==outputLength)throw Error('输出尺寸与索引循环不一致');
console.log({stride,outputLength,outputs,parameterCount:kernel.length+1});`};

  V['cs230-11']={title:'记忆通道：五次遗忘门相乘后还剩多少梯度？',param:'固定遗忘门 f',min:.1,max:1,step:.1,value:.8,steps:['保存初始状态 c₀=1','一次门控：值与导数同乘 f','连续三次更新','五步后比较门控路径与 tanh 路径'],render(step,forget){
    const cell=[1],rnn=[1],derivatives=[1];let g=1;
    for(let t=1;t<=5;t++){cell.push(forget*cell[t-1]);rnn.push(Math.tanh(forget*rnn[t-1]));g*=forget*(1-rnn[t]**2);derivatives.push(g);}
    const shown=[0,1,3,5][step],memory=cell[5],cellGradient=forget**5,rnnState=rnn[5],rnnGradient=derivatives[5];
    let svg=text(26,29,'固定门、无新写入：cₜ=f·cₜ₋₁；对照 hₜ=tanh(f·hₜ₋₁)','v-title');
    for(let i=0;i<6;i++){const x=26+i*121;svg+=rect(x,85,99,58,i<=shown?'v-node active':'v-node')+text(x+49,108,`t=${i}`,'v-center v-small')+text(x+49,131,i<=shown?fmt(cell[i],3):'…','v-center');if(i<5)svg+=arrow(x+101,115,x+117,115);}
    svg+=text(28,188,`门控直通路径：∂c${shown}/∂c0 = f^${shown} = ${fmt(forget**shown,6)}`);
    svg+=text(28,224,`tanh 路径梯度：${fmt(derivatives[shown],6)}（每步还乘 1−h²）`);
    svg+=bar(28,270,305,forget**shown,'门控路径梯度')+bar(405,270,305,derivatives[shown],'tanh 路径梯度','#ffe38a');
    const bodies=[
      '从c₀=1开始，令后续输入写入为0，遗忘门固定为f。这个控制实验只研究LSTM细胞状态的直接通路；暂时不学习门、不加输出门，也不把它称为完整LSTM。',
      `一步得到c₁=f=${fmt(forget,1)}，对初始状态的导数也为f。若f接近1，之前的内容被较多保留；较小的f意味着主动遗忘。`,
      `三步后c₃=f³=${fmt(forget**3,6)}。链式法则将三个局部导数相乘，所以记忆保留和这条直接路径的梯度都按幂次变化。裁剪爆炸梯度不能把已经缩小的梯度恢复成1。`,
      `五步直通路径留下${fmt(memory,6)}，导数同为${fmt(cellGradient,6)}。对照hₜ=tanh(fhₜ₋₁)，每步还乘(1−hₜ²)，最终梯度仅${fmt(rnnGradient,6)}。真实LSTM的总导数还包含门随状态变化的路径；这里只隔离了常用来解释长程记忆的直接通路。`
    ];
    return {svg,formula:'∂c_T/∂c₀=∏ₜfₜ；固定 f 时为 f^T；∂h_T/∂h₀=∏ₜf(1−hₜ²)',body:bodies[step],result:`T=5：c=${fmt(memory,6)} · 直通梯度 ${fmt(cellGradient,6)} · tanh 梯度 ${fmt(rnnGradient,6)}`,note:'所有门被固定，未加入输入写入和输出门。结论只针对所示路径，不表示LSTM永远不会梯度消失。',metrics:{forget,memory,cellGradient,rnnState,rnnGradient}};
  }};
  C['cs230-11']={name:'时间上的链式法则：门控通路与 tanh 对照',instructions:['先计算 .8⁵，再运行检查记忆和梯度。','将 forget 改为 .1 和 1，观察两条路径的差异。','指出真实LSTM中哪些被固定的量还会依赖输入与隐状态。'],expected:'f=.8、T=5：memory=cellGradient=.32768；tanh状态≈.2264448214，tanh路径梯度≈.1049757032。',code:`const forget=0.8,T=5;
let memory=1,cellGradient=1,rnnState=1,rnnGradient=1;
for(let t=1;t<=T;t++){
  memory*=forget;
  cellGradient*=forget;
  rnnState=Math.tanh(forget*rnnState);
  rnnGradient*=forget*(1-rnnState*rnnState);
  console.log({t,memory,cellGradient,rnnState,rnnGradient});
}
console.log({forget,memory,cellGradient,rnnState,rnnGradient});`};

  V['cs230-12']={title:'两张遮罩：过去的位置，也可能是无效 padding',param:'遮罩模式：0无 / 1补齐 / 2因果 / 3两者',min:0,max:3,step:1,value:3,steps:['左补齐序列中的当前查询','先在分数上排除非法位置','只对合法位置归一化','用归一化权重读取 value'],render(step,maskMode){
    const labels=['PAD','A','B','C'],raw=[8,1,2,4],values=[100,2,4,8],queryIndex=2;
    const usePadding=maskMode===1||maskMode===3,useCausal=maskMode===2||maskMode===3;
    const allowed=raw.map((_,i)=>(!usePadding||i!==0)&&(!useCausal||i<=queryIndex));
    const denominator=raw.reduce((s,n,i)=>s+(allowed[i]?n:0),0),weights=raw.map((n,i)=>allowed[i]?n/denominator:0);
    const output=weights.reduce((s,w,i)=>s+w*values[i],0),allowedCount=allowed.filter(Boolean).length;
    let svg=text(26,29,'查询在 B（位置 2）；左侧 PAD 不是有效上下文','v-title');
    labels.forEach((label,i)=>{const x=28+i*185;svg+=node(x,57,160,label,`value=${values[i]}`,i===queryIndex);svg+=text(x+80,153,`exp(score)=${raw[i]}`,'v-center v-small');if(step>=1)svg+=text(x+80,190,allowed[i]?'保留':'排除','v-center');if(step>=2)svg+=bar(x+8,226,145,weights[i],`权重 ${fmt(weights[i],4)}`,colors[i]);});
    if(step>=3)svg+=text(30,301,`读取结果 = ${weights.map((w,i)=>`${fmt(w,2)}×${values[i]}`).join(' + ')} = ${fmt(output,4)}`,'v-small');
    const modeNames=['不遮罩（故意泄漏）','只排除 padding','只排除未来','同时排除 padding 和未来'];
    const bodies=[
      '序列为[PAD,A,B,C]，当前查询来自B。为了可以手算，q=1，keys=[ln8,0,ln2,ln4]，因此指数分数为[8,1,2,4]。PAD的value被故意设为100，用来暴露没有屏蔽无效位置的后果。',
      `当前模式：${modeNames[maskMode]}。padding mask 排除位置0；causal mask 排除位置3。左padding虽然位于“过去”，仍不是合法上下文，所以因果约束不能替代补齐约束。`,
      `遮罩应用于softmax之前。合法指数分数之和为${denominator}，归一化权重为[${weights.map(w=>fmt(w,4)).join(', ')}]，和为1。先归一化再简单清零会丢失概率质量，除非重新归一化。`,
      `读取结果为Σwᵢvᵢ=${fmt(output,6)}。两张遮罩同时启用时，只有A与B，权重1/3和2/3，得到10/3；PAD与未来C的值都不应影响结果。注意力分配说明模型如何混合表示，不自动构成因果解释。`
    ];
    return {svg,formula:'合法(i)=(非PAD) ∧ (i≤queryIndex)；wᵢ=1[合法(i)]eˢⁱ/Σ合法 eˢʲ；o=Σwᵢvᵢ',body:bodies[step],result:`${modeNames[maskMode]} · 输出 ${fmt(output,6)} · PAD 权重 ${fmt(weights[0],4)} · 未来权重 ${fmt(weights[3],4)}`,note:'社区衔接专题；单查询、单维键和固定分数的教学模型。此处确保至少有一个合法键，避免全mask行的未定义softmax。',metrics:{maskMode,weights,output,allowedCount,futureWeight:weights[3],paddingWeight:weights[0]}};
  }};
  C['cs230-12']={name:'注意力遮罩：左 padding 与未来信息分别排除',instructions:['默认同时开启两种mask，手算合法权重1/3与2/3。','将 maskMode 依次改为0、1、2，定位污染来源。','保持maskMode=3，只改PAD或未来位置的value，输出应保持不变。'],expected:'mode=3：weights=[0,1/3,2/3,0]，output=10/3；mode=0为842/15，mode=1为6，mode=2为810/11。',code:`const query=1,keys=[Math.log(8),0,Math.log(2),Math.log(4)],values=[100,2,4,8];
const queryIndex=2,maskMode=3;
const usePadding=maskMode===1||maskMode===3,useCausal=maskMode===2||maskMode===3;
const scores=keys.map(k=>query*k);
const allowed=scores.map((_,i)=>(!usePadding||i!==0)&&(!useCausal||i<=queryIndex));
const validScores=scores.filter((_,i)=>allowed[i]);
if(validScores.length===0)throw Error('没有合法key，不能做softmax');
const max=Math.max(...validScores);
const unnormalized=scores.map((s,i)=>allowed[i]?Math.exp(s-max):0);
const denominator=unnormalized.reduce((a,b)=>a+b,0);
const weights=unnormalized.map(w=>w/denominator);
const output=weights.reduce((sum,w,i)=>sum+w*values[i],0);
console.log({maskMode,weights,output,allowedCount:allowed.filter(Boolean).length,
  futureWeight:weights[3],paddingWeight:weights[0]});`};
})();
