/* CS336 07–12: communication, sharding, fitted scaling, inference, budget allocation, and evaluation. */
(() => {
  'use strict';
  const {text,line,arrow,rect,node,point,fmt}=window.MLVis;
  const V=window.COURSE_VISUALS ||= {},C=window.COURSE_CODE ||= {};
  const colors=['#62b4ee','#50dfc2','#ffe38a','#c2a0ed','#e99476'];
  const block=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${h}" fill="${fill}" rx="3"/>`;
  V['cs336-07']={title:'环形 All-reduce：通信量不等于暴露在关键路径上的时间',param:'梯度就绪后可重叠的计算窗口（ms）',min:0,max:24,step:4,value:12,steps:['每个rank完成两段环形传递','将字节数与启动延迟换算成时间','串行执行时两段时间相加','只隐藏实际可重叠的通信'],render(step,overlapMs){
    const ranks=4,gradientBytes=120e6,bytesPerRank=2*(ranks-1)/ranks*gradientBytes,commMs=bytesPerRank/12e9*1000+2*(ranks-1)*.1;
    const hiddenMs=Math.min(commMs,overlapMs),exposedMs=commMs-hiddenMs,stepMs=40+exposedMs,serialMs=40+commMs,globalBatch=32;
    let svg=text(26,29,'4个rank · 梯度120 MB · 单向有效带宽12 GB/s','v-title');
    for(let i=0;i<4;i++){const x=30+i*183;svg+=node(x,57,145,`rank ${i}`,'两段环形传递',step===0);if(i<3)svg+=arrow(x+148,90,x+177,90);}
    svg+=line(651,126,651,138,'v-edge')+line(651,138,103,138,'v-edge')+arrow(103,138,103,126,'v-edge');
    svg+=text(28,157,`每rank发送 180 MB；6个阶段 × 0.1 ms；通信 ${fmt(commMs,1)} ms`,'v-small');
    svg+=text(28,197,'串行','v-small')+block(95,178,400,27,colors[0])+block(495,178,commMs*10,27,colors[2]);
    svg+=text(300,197,'计算40 ms','v-center v-small').replace('<text ','<text style="fill:#102030" ')+text(565,197,'通信15.6','v-center v-small').replace('<text ','<text style="fill:#102030" ');
    if(step>=3){svg+=text(28,250,'重叠','v-small')+block(95,225,400,24,colors[0])+block(95+(40-hiddenMs)*10,252,commMs*10,22,colors[1])+text(95+(40-hiddenMs)*10,294,`隐藏 ${fmt(hiddenMs,1)} ms，暴露 ${fmt(exposedMs,1)} ms`,'v-small');}
    const bodies=[
      '环形all-reduce可拆成reduce-scatter与all-gather，各有P−1个阶段，每阶段每rank发送S/P字节。因此每rank总发送2(P−1)S/P；接收量相同。这里用每方向有效带宽，不把发送和接收重复相加后再套同一全双工带宽。',
      'P=4、S=120 MB时，每rank发送180 MB。以12 GB/s估计带宽时间15 ms，再加6个阶段各0.1 ms启动延迟，通信约15.6 ms。MB、GB均按十进制；这是理想环模型，不包含拓扑拥塞或实现差异。',
      '若反向计算40 ms后才开始通信，串行关键路径为40+15.6=55.6 ms。计算结束前尚未就绪的梯度桶不能提前发出；仅仅启用异步API并不自动产生有效重叠。',
      `假设梯度桶就绪后仍有${fmt(overlapMs,0)} ms独立计算，最多隐藏min(${overlapMs},15.6)=${fmt(hiddenMs,1)} ms通信，实际暴露${fmt(exposedMs,1)} ms，每步下界${fmt(stepMs,1)} ms。重叠窗口超过通信时间后收益饱和；本例没有测量真实GPU。`
    ];
    return {svg,formula:'发送量/rank=2(P−1)S/P；Tcomm=发送量/B+2(P−1)α；Tstep=Tcompute+max(0,Tcomm−Toverlap)',body:bodies[step],result:`串行 ${fmt(serialMs,1)} ms → 重叠 ${fmt(stepMs,1)} ms · 全局批量2×4×4=${globalBatch}`,note:'固定4个rank和40ms计算，重叠仅为可达到的上限；带宽、延迟与就绪时刻均为教学假设。',metrics:{ranks,gradientBytes,bytesPerRank,commMs,overlapMs,hiddenMs,exposedMs,stepMs,serialMs,globalBatch}};
  }};
  C['cs336-07']={name:'All-reduce 成本：先算每rank字节，再算关键路径',instructions:['区分每rank发送量、接收量和整个集群的总发送量。','将 overlapMs 改为0、12、24，观察隐藏时间何时饱和。','改变ranks时解释启动阶段数与带宽项分别怎样变化；不要假设固定计算时间代表强扩展实测。'],expected:'4rank每rank发送180 MB，通信15.6 ms；重叠窗口12 ms后总步43.6 ms，完全串行为55.6 ms。',code:`const ranks=4,gradientBytes=120e6,bandwidth=12e9,latencyMs=.1,computeMs=40,overlapMs=12;
const phases=2*(ranks-1),bytesPerRank=phases*gradientBytes/ranks;
const commMs=bytesPerRank/bandwidth*1000+phases*latencyMs;
const hiddenMs=Math.min(commMs,overlapMs),exposedMs=commMs-hiddenMs;
const stepMs=computeMs+exposedMs,serialMs=computeMs+commMs;
const globalBatch=2*ranks*4;
console.log({ranks,gradientBytes,bytesPerRank,commMs,overlapMs,hiddenMs,exposedMs,stepMs,serialMs,globalBatch});`};

  V['cs336-08']={title:'ZeRO 分片：哪些状态被除以设备数，哪些没有？',param:'ZeRO阶段：0无 / 1优化器 / 2再分梯度 / 3再分权重',min:0,max:3,step:1,value:2,steps:['先列出完整训练状态','阶段1只分片优化器状态','再按阶段分片梯度与权重','把激活和临时空间单独加回'],render(step,stage){
    const ranks=4,weightsGB=stage>=3?.5:2,gradientsGB=stage>=2?.5:2,optimizerGB=stage>=1?3:12;
    const statesGB=weightsGB+gradientsGB+optimizerGB,activationGB=3,workspaceGB=1,totalGB=statesGB+4,unshardedStatesGB=16;
    const parts=[weightsGB,gradientsGB,optimizerGB,activationGB,workspaceGB],labels=['BF16权重','BF16梯度','优化器/主权重','激活','临时空间'];
    let svg=text(26,29,'10亿参数，4个rank；所有容量使用十进制GB','v-title');
    svg+=text(28,73,'未分片基线：2 + 2 + 12 + 3 + 1 = 20 GB','v-small');
    let x=28;[2,2,12,3,1].forEach((v,i)=>{svg+=block(x,88,v*34,30,colors[i]);x+=v*34;});
    svg+=text(28,160,`选定阶段 ${stage}：常驻训练状态 ${fmt(statesGB,1)} GB`);
    x=28;parts.forEach((v,i)=>{svg+=block(x,176,v*34,30,colors[i]);x+=v*34;});
    parts.forEach((v,i)=>{const px=28+i*145;svg+=block(px,236,12,12,colors[i])+text(px+18,247,labels[i],'v-small')+text(px+18,273,`${fmt(v,1)} GB`,'v-small');});
    svg+=text(28,313,`状态 ${fmt(statesGB,1)} + 激活3 + 临时1 = ${fmt(totalGB,1)} GB`,'v-title');
    const bodies=[
      '10亿参数的BF16权重2 GB，BF16梯度2 GB；假设还保留FP32主权重4 GB和Adam两个FP32矩共8 GB，优化器相关合计12 GB。三类常驻状态共16 GB，并非只有模型文件的2 GB。',
      'ZeRO-1仅将12 GB优化器相关状态在4个rank分片，变成每rank3 GB；权重与梯度仍各2 GB，常驻状态为7 GB。这里把FP32主权重归入优化器状态，并明确使用BF16梯度。',
      `ZeRO-2再将梯度分片为0.5 GB，总状态5.5 GB；ZeRO-3再将权重分片为0.5 GB，总状态4 GB。当前选择阶段${stage}得到${fmt(statesGB,1)} GB。参数汇集、预取与释放顺序会决定额外通信及短时峰值。`,
      `本例另给每rank固定3 GB激活和1 GB临时空间，当前总量${fmt(totalGB,1)} GB。不能把全部20 GB直接除以4，宣称阶段3只需5 GB。固定1 GB临时空间只是预算假设，真实峰值应结合层大小、预取和测量。`
    ];
    return {svg,formula:'阶段0:16；1:2+2+12/P；2:2+(2+12)/P；3:(2+2+12)/P；激活/临时另计',body:bodies[step],result:`ZeRO-${stage} · 状态 ${fmt(statesGB,1)} GB · 含激活/临时 ${fmt(totalGB,1)} GB`,note:'不是任意框架的统一显存倍数：梯度精度、主权重、副本、通信缓冲区和激活重计算会改变预算。',metrics:{stage,ranks,weightsGB,gradientsGB,optimizerGB,statesGB,activationGB,workspaceGB,totalGB,unshardedStatesGB}};
  }};
  C['cs336-08']={name:'ZeRO 内存表：按状态类别选择分片因子',instructions:['逐项核对BF16权重、BF16梯度、FP32主权重和Adam矩。','改stage为0、1、2、3，记录常驻状态与含激活总量。','把activationGB增大，解释为什么分片优化器无法解决所有显存问题。'],expected:'常驻状态阶段0/1/2/3分别16、7、5.5、4 GB；激活3 GB加临时1 GB后，总量20、11、9.5、8 GB。',code:`const parameters=1e9,ranks=4,stage=2;
const fullWeights=parameters*2/1e9,fullGradients=parameters*2/1e9;
// FP32 master copy plus two FP32 Adam moments: 4+4+4 bytes/parameter.
const fullOptimizer=parameters*12/1e9;
const weightsGB=fullWeights/(stage>=3?ranks:1);
const gradientsGB=fullGradients/(stage>=2?ranks:1);
const optimizerGB=fullOptimizer/(stage>=1?ranks:1);
const statesGB=weightsGB+gradientsGB+optimizerGB,activationGB=3,workspaceGB=1;
console.log({stage,ranks,weightsGB,gradientsGB,optimizerGB,statesGB,activationGB,workspaceGB,
  totalGB:statesGB+activationGB+workspaceGB,unshardedStatesGB:fullWeights+fullGradients+fullOptimizer});`};

  V['cs336-09']={title:'先拟合，再留出：看起来像直线，不代表外推正确',param:'假设的不可约损失 E',min:0,max:1.25,step:.25,value:1,steps:['固定三个训练规模的观测','减去不可约项后取对数','在线性空间拟合截距与斜率','预测未参与拟合的64倍规模'],render(step,assumedFloor){
    const sizes=[1,4,16],losses=[3,2,1.5],xs=sizes.map(Math.log),ys=losses.map(l=>Math.log(l-assumedFloor));
    const mx=xs.reduce((a,b)=>a+b)/3,my=ys.reduce((a,b)=>a+b)/3;
    const slope=xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0)/xs.reduce((s,x)=>s+(x-mx)**2,0);
    const exponent=-slope,coefficient=Math.exp(my-slope*mx),predict=n=>assumedFloor+coefficient/n**exponent;
    const predicted=predict(64),heldOut=1.3,absoluteError=Math.abs(predicted-heldOut),trainingRMSE=Math.sqrt(losses.reduce((s,l,i)=>s+(predict(sizes[i])-l)**2,0)/3),heldOutRelativeError=absoluteError/heldOut;
    const px=n=>55+82*Math.log2(n),py=l=>275-70*l;
    let svg=text(26,29,'拟合数据 N=[1,4,16]，L=[3,2,1.5]；留出N=64','v-title');
    svg+=line(45,275,570,275,'v-axis')+line(55,45,55,280,'v-axis');
    if(step>=2){let path='';for(let j=0;j<=64;j++){const n=2**(j*6/64);path+=`${j?'L':'M'}${px(n)},${py(predict(n))} `;}svg+=`<path d="${path}" class="v-trail"/>`;}
    sizes.forEach((n,i)=>{svg+=point(px(n),py(losses[i]),6)+text(px(n),300,`${n}`,'v-center v-small');});
    if(step===3)svg+=point(px(64),py(heldOut),7)+line(px(64),py(heldOut),px(64),py(predicted),'v-yellow')+text(px(64),300,'64留出','v-center v-small');
    svg+=text(592,90,`E=${fmt(assumedFloor,2)}`)+text(592,132,`A=${fmt(coefficient,4)}`)+text(592,174,`α=${fmt(exponent,4)}`)+text(592,216,`预测${fmt(predicted,4)}`,'v-small')+text(592,253,'观测1.3000','v-small');
    const bodies=[
      '三个观测规模为1、4、16，验证损失为3、2、1.5。数据、架构与测量协议在此固定，N是相对规模单位。第四个规模64的观测1.3先留出，不能参与拟合或挑选假设。',
      `假设L=E+A/N^α，当前E=${fmt(assumedFloor,2)}。先计算log(L−E)，再对logN拟合。直接logL会混合不可约项与可缩减项。E必须小于所有拟合损失；本实验slider限制在安全范围。`,
      `最小二乘斜率为−α=${fmt(slope,6)}，截距为logA，得到A=${fmt(coefficient,6)}。原损失空间训练RMSE=${fmt(trainingRMSE,6)}；拟合好坏还依赖E，而不只依赖散点“看着直”。`,
      `对留出N=64预测${fmt(predicted,6)}，实际1.3，绝对误差${fmt(absoluteError,6)}。默认E=1可完美穿过三个训练点，但仍有0.05留出误差。改变E后观察敏感性，不应再用同一留出点反复挑E并继续称它为最终独立测试。`
    ];
    return {svg,formula:'log(L−E)=logA−αlogN；α=−Cov(logN,log(L−E))/Var(logN)',body:bodies[step],result:`A=${fmt(coefficient,4)} · α=${fmt(exponent,4)} · 留出绝对误差 ${fmt(absoluteError,6)}`,note:'第9讲估计经验关系；第11讲才在假定关系下做预算优化。图的横轴为log₂N，纵轴显示原始损失。',metrics:{assumedFloor,exponent,coefficient,predicted,heldOut,absoluteError,trainingRMSE,heldOutRelativeError}};
  }};
  C['cs336-09']={name:'幂律拟合：训练点与外推检查点分开',instructions:['默认E=1时手算损失残差2、1、.5和指数.5。','改变assumedFloor，比较拟合系数与留出误差。','解释为何训练RMSE为0仍无法保证新规模准确。'],expected:'E=1得到A=2、α=.5；N=64预测1.25，留出观测1.3，绝对误差.05，相对约3.846%。',code:`const sizes=[1,4,16],losses=[3,2,1.5],assumedFloor=1;
if(losses.some(l=>l<=assumedFloor))throw Error('log(L-E)要求L>E');
const x=sizes.map(Math.log),y=losses.map(l=>Math.log(l-assumedFloor));
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,mx=mean(x),my=mean(y);
const slope=x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0)/x.reduce((s,v)=>s+(v-mx)**2,0);
const exponent=-slope,coefficient=Math.exp(my-slope*mx);
const predict=n=>assumedFloor+coefficient/n**exponent;
const predicted=predict(64),heldOut=1.3,absoluteError=Math.abs(predicted-heldOut);
const trainingRMSE=Math.sqrt(mean(losses.map((l,i)=>(predict(sizes[i])-l)**2)));
console.log({assumedFloor,exponent,coefficient,predicted,heldOut,absoluteError,trainingRMSE,heldOutRelativeError:absoluteError/heldOut});`};

  V['cs336-10']={title:'Prefill 与 decode：计算很多，和每步反复读很多，是两回事',param:'已有上下文 token 数 T',min:128,max:1024,step:128,value:256,steps:['固定模型、GQA头数与计量单位','预填充一次处理整个提示','解码只加一个查询，但读取全部历史KV','用计算与带宽分别给出时间下界'],render(step,context){
    const parameters=1e6,layers=2,queryHeads=4,kvHeads=2,headDim=8,weightBytes=2*parameters;
    const kvBytes=2*layers*kvHeads*headDim*context*2,decodeReadBytes=weightBytes+kvBytes;
    const prefillFLOPs=2*parameters*context+4*layers*queryHeads*headDim*context**2;
    const decodeFLOPs=2*parameters+4*layers*queryHeads*headDim*context;
    const decodeComputeMs=decodeFLOPs/1e12*1000,decodeBandwidthMs=decodeReadBytes/10e9*1000,decodeLowerBoundMs=Math.max(decodeComputeMs,decodeBandwidthMs),prefillComputeMs=prefillFLOPs/1e12*1000;
    let svg=text(26,29,'100万参数 · 2层 · Q头4 / KV头2 · 头维8 · BF16','v-title');
    svg+=node(28,66,300,'Prefill：整段提示并行',`${context}个query · ${fmt(prefillFLOPs/1e6,3)} MFLOPs`,step===1)+node(423,66,300,'Decode：追加一个token',`1个query · ${fmt(decodeFLOPs/1e6,3)} MFLOPs`,step===2);
    svg+=arrow(333,98,412,98)+text(30,177,`KV缓存 2×2×2×8×${context}×2 = ${kvBytes} B`,'v-small');
    svg+=text(30,210,`每步读取权重与KV ≈ ${fmt(decodeReadBytes/1e6,6)} MB`,'v-small');
    svg+=text(30,251,`解码计算下界 ${fmt(decodeComputeMs,6)} ms`)+text(30,283,`解码带宽下界 ${fmt(decodeBandwidthMs,6)} ms`);
    svg+=text(475,236,'取两种下界的较大者','v-small')+text(475,275,`${fmt(decodeLowerBoundMs,6)} ms`,'v-title');
    const bodies=[
      '固定batch=1、参数N=10⁶、2层、4个查询头、2个KV头，每头8维、元素2字节。这里是GQA，缓存按KV头数计算，注意力运算按查询头数计算；两者不能互换。',
      `近似投影计算2NT，加上未利用三角稀疏的dense注意力4Lh_qdT²，得到${prefillFLOPs} FLOPs。模型计算能力假设为1 TFLOP/s，单纯计算下界${fmt(prefillComputeMs,6)} ms；这不是实测首token延迟。`,
      `新查询的近似计算是2N+4Lh_qdT=${decodeFLOPs} FLOPs，缓存历史KV共${kvBytes}字节。缓存避免重复投影历史token，但新query仍需读取历史key/value；再加权重读取得${decodeReadBytes}字节。`,
      `假设有效带宽10 GB/s，读带宽下界${fmt(decodeBandwidthMs,6)} ms，高于计算下界${fmt(decodeComputeMs,6)} ms。取max给出乐观roofline下界，实际还包含启动、调度、缓存层次、输出投影与工作区等成本。T增长增加KV读取，不意味着每步都重算整段prefill。`
    ];
    return {svg,formula:'KV字节=2Lh_kv dT·bytes；prefill≈2NT+4Lh_qdT²；decode≈2N+4Lh_qdT',body:bodies[step],result:`T=${context} · KV ${fmt(kvBytes/1024,1)} KiB · decode乐观下界 ${fmt(decodeLowerBoundMs,6)} ms`,note:'纯教学性能模型；1 TFLOP/s与10 GB/s为假设，非GPU实测。dense注意力计算不按因果三角减半，忽略部分算子与新KV写入。',metrics:{context,kvHeads,queryHeads,headDim,layers,kvBytes,weightBytes,decodeReadBytes,prefillFLOPs,decodeFLOPs,decodeComputeMs,decodeBandwidthMs,decodeLowerBoundMs,prefillComputeMs}};
  }};
  C['cs336-10']={name:'推理预算：分别估算计算与历史KV读取',instructions:['核对KV公式中的2分别表示K/V与BF16字节宽度。','将context从256改为512，比较KV、prefill注意力项和decode注意力项。','改变假设带宽和算力，检查瓶颈是否切换，勿把结果写成真实吞吐。'],expected:'T=256：KV32768 B，prefill528777216 FLOPs，decode2065536 FLOPs。假设下decode计算.002065536 ms，带宽.2032768 ms，取较大者。',code:`const parameters=1e6,layers=2,queryHeads=4,kvHeads=2,headDim=8,context=256,bytes=2;
const computePerSecond=1e12,bandwidthBytesPerSecond=10e9;
const weightBytes=parameters*bytes,kvBytes=2*layers*kvHeads*headDim*context*bytes;
const decodeReadBytes=weightBytes+kvBytes;
const prefillFLOPs=2*parameters*context+4*layers*queryHeads*headDim*context**2;
const decodeFLOPs=2*parameters+4*layers*queryHeads*headDim*context;
const decodeComputeMs=1000*decodeFLOPs/computePerSecond,decodeBandwidthMs=1000*decodeReadBytes/bandwidthBytesPerSecond;
const decodeLowerBoundMs=Math.max(decodeComputeMs,decodeBandwidthMs),prefillComputeMs=1000*prefillFLOPs/computePerSecond;
console.log({context,kvHeads,queryHeads,headDim,layers,kvBytes,weightBytes,decodeReadBytes,prefillFLOPs,decodeFLOPs,decodeComputeMs,decodeBandwidthMs,decodeLowerBoundMs,prefillComputeMs});`};

  V['cs336-11']={title:'固定计算预算：模型大一倍，少掉的数据值不值得？',param:'模型规模 N（归一化单位）',min:1,max:20,step:1,value:10,steps:['先固定成本与经验损失假设','消去数据规模 D','比较两项误差的边际变化','求预算曲线上的最优配比'],render(step,modelSize){
    const compute=600,K=compute/6,dataSize=K/modelSize,modelTerm=4/modelSize,dataTerm=9/dataSize,loss=1+modelTerm+dataTerm;
    const optimalModelSize=Math.sqrt(4*K/9),optimalDataSize=K/optimalModelSize,optimalLoss=1+4/optimalModelSize+9/optimalDataSize,gap=loss-optimalLoss;
    const px=n=>45+(n-1)*20,py=l=>279-(l-2)*58;
    let svg=text(26,29,'教学假设：L=1+4/N+9/D；C=6ND=600','v-title');
    svg+=line(40,282,435,282,'v-axis')+line(45,55,45,282,'v-axis');let path='';for(let j=0;j<=100;j++){const n=1+19*j/100;path+=`${j?'L':'M'}${px(n)},${py(1+4/n+.09*n)} `;}svg+=`<path d="${path}" class="v-trail"/>`;
    svg+=point(px(modelSize),py(loss),7)+text(px(modelSize),305,`N=${modelSize}`,'v-center v-small');if(step>=3)svg+=point(px(optimalModelSize),py(optimalLoss),5,'v-history')+line(px(optimalModelSize),py(optimalLoss),px(optimalModelSize),282,'v-yellow');
    svg+=text(475,78,`N=${fmt(modelSize,3)}，D=${fmt(dataSize,3)}`)+text(475,120,`模型项 4/N=${fmt(modelTerm,4)}`,'v-small')+text(475,154,`数据项 9/D=${fmt(dataTerm,4)}`,'v-small')+text(475,202,`当前损失 ${fmt(loss,4)}`,'v-title')+text(475,246,`最优 N=${fmt(optimalModelSize,4)}`,'v-small')+text(475,278,`最优损失 ${fmt(optimalLoss,4)}`,'v-small');
    const bodies=[
      '本讲把已经给定的经验关系转为决策，区别于第9讲从观测拟合系数。假设E=1、A=4、B=9、α=β=1，N和D均为归一化规模，C也是相应成本单位。所有常数用于教学，不是实测Chinchilla规律。',
      `C=600意味着ND=100，因此D=100/N。当前N=${modelSize}，D=${fmt(dataSize,4)}，模型误差项${fmt(modelTerm,4)}，数据误差项${fmt(dataTerm,4)}。增大N会降低第一项，但同时减少D、提高第二项。`,
      '代入后L(N)=1+4/N+0.09N，导数为−4/N²+0.09。N较小时负项占优，应增加模型；N较大时少训练数据的代价占优。最低点的条件是边际变化平衡，不是机械要求N=D。',
      `令导数为0，得到N*=sqrt(4/.09)=20/3≈${fmt(optimalModelSize,4)}，D*=15，两项误差均为0.6，最优损失2.2。滑杆只选整数N，此时最佳候选是N=7；图中另标连续最优点。当前配置损失${fmt(loss,4)}，与连续最优差${fmt(gap,4)}。若指数不同、数据重复或加入推理成本，这个解都要重新计算。`
    ];
    return {svg,formula:'D=C/(6N)；L(N)=1+4/N+0.09N；dL/dN=−4/N²+0.09；N*=20/3',body:bodies[step],result:`N=${modelSize} · D=${fmt(dataSize,3)} · L=${fmt(loss,4)} · 最优差 ${fmt(gap,4)}`,note:'连续归一化规模的教学优化，忽略离散模型形状、硬件效率与数据上限；不能据此声称真实训练存在固定通用参数/token配比。',metrics:{modelSize,dataSize,compute,loss,optimalModelSize,optimalDataSize,optimalLoss,gap,modelTerm,dataTerm}};
  }};
  C['cs336-11']={name:'计算最优：沿同一预算曲线选择模型与数据',instructions:['默认N=10时核对D=10与损失2.3。','将modelSize改为20/3，验证两个误差项均为.6、损失2.2。','改变A/B或alpha/beta，重新求最优点；不要把教学常数当作真实规模规律。'],expected:'C=600、α=β=1、A=4、B=9：最优N=20/3，D=15，loss=2.2；默认N=D=10时loss=2.3。',code:`const compute=600,E=1,A=4,B=9,alpha=1,beta=1,modelSize=10;
const K=compute/6,dataSize=K/modelSize;
const modelTerm=A/modelSize**alpha,dataTerm=B/dataSize**beta,loss=E+modelTerm+dataTerm;
// Stationary condition: alpha*A/N^alpha = beta*B/D^beta with ND=K.
const optimalModelSize=(alpha*A*K**beta/(beta*B))**(1/(alpha+beta));
const optimalDataSize=K/optimalModelSize;
const optimalLoss=E+A/optimalModelSize**alpha+B/optimalDataSize**beta;
console.log({modelSize,dataSize,compute,loss,optimalModelSize,optimalDataSize,optimalLoss,gap:loss-optimalLoss,modelTerm,dataTerm});`};

  V['cs336-12']={title:'困惑度的分母：同一文本换分词，就能从4变成2',param:'同一4字节文本的 token 数',min:1,max:4,step:1,value:2,steps:['固定文本及整段联合概率','把总负对数似然除以token数','再换算成每字节比特数','多条序列先汇总损失和长度'],render(step,tokenCount){
    const totalBytes=4,totalNLL=Math.log(16),meanNLL=totalNLL/tokenCount,perplexity=Math.exp(meanNLL),bitsPerByte=totalNLL/Math.log(2)/totalBytes,sequenceProbability=1/16,referenceTokens=4,referencePerplexity=2;
    const pooledPerplexity=Math.exp((totalNLL+6*Math.log(2))/(tokenCount+6)),macroMeanPerplexity=(perplexity+2)/2;
    const segments={1:['abcd'],2:['ab','cd'],3:['a','b','cd'],4:['a','b','c','d']}[tokenCount];
    let svg=text(26,29,'同一ASCII文本 “abcd”，4字节，假设联合概率均为1/16','v-title');
    const width=640/tokenCount;segments.forEach((s,i)=>{const x=40+i*width;svg+=node(x,69,width-14,s,`p=${fmt(1/perplexity,4)}`,step===0);});
    svg+=text(30,177,`总NLL = ln16 = ${fmt(totalNLL,6)} nats`)+text(30,215,`每token NLL=${fmt(meanNLL,6)}；PPL=${fmt(perplexity,6)}`);
    svg+=text(30,253,`每字节比特 = ln16 / (ln2 × 4) = 1`,'v-title');
    if(step>=3)svg+=text(30,299,`与另一条6token、PPL2序列合并：正确 ${fmt(pooledPerplexity,6)}，直接平均 ${fmt(macroMeanPerplexity,6)}`,'v-small');
    const bodies=[
      '构造一个可比较分母的控制例子：同一4字节ASCII文本abcd，在不同切分下都被赋予联合概率1/16。为手算方便，每个token条件概率都设为(1/16)^(1/k)。这是人为控制联合概率，不是说现实模型换分词后概率自动相等。',
      `当前k=${tokenCount}，平均负对数似然为ln16/${tokenCount}，PPL=exp(平均NLL)=${fmt(perplexity,6)}。两token时PPL4，四token时PPL2；数字降低仅因计量单位变化，不能宣布后者对同一文本预测更好。`,
      '改用明确的字节分母，bits-per-byte=NLL/(ln2×4)=1，两个切分得到相同结果。比较时仍要统一文本、编码、规范化和边界处理；“按字节”不是自动消除所有模型或数据差异。',
      `再加入另一条6token、总NLL=6ln2的序列。应先把总NLL和token数相加再取指数，得到${fmt(pooledPerplexity,6)}；直接平均两个PPL得到${fmt(macroMeanPerplexity,6)}，一般不等价。每token平均、每序列平均、每字节平均各自对应不同问题。`
    ];
    return {svg,formula:'NLL=−Σlog p(token|prefix)；PPL=exp(NLL/n)；BPB=NLL/(ln2·bytes)',body:bodies[step],result:`PPL ${fmt(perplexity,6)} · BPB=1 · 长度加权PPL ${fmt(pooledPerplexity,6)}`,note:'损失使用自然对数nats，换算bits须除以ln2。真实跨tokenizer比较还需统一相同原文、编码与文本处理协议。',metrics:{tokenCount,totalBytes,totalNLL,meanNLL,perplexity,bitsPerByte,sequenceProbability,referenceTokens,referencePerplexity,pooledPerplexity,macroMeanPerplexity}};
  }};
  C['cs336-12']={name:'困惑度核算：分词单位与序列权重不要混用',instructions:['保持文本联合概率不变，将tokenCount从2改为4。','检查PPL改变而bits-per-byte不变，解释比较陷阱。','合并另一条6token序列，比较先汇总NLL与直接平均PPL。'],expected:'默认2token：总NLL=ln16，PPL4，BPB1；4token参考PPL2。同6token/PPL2序列合并，默认正确PPL=2^1.25≈2.378414，简单均值3。',code:`const tokenCount=2,totalBytes=4,sequenceProbability=1/16;
const conditionalProbability=sequenceProbability**(1/tokenCount);
const logProbabilities=Array(tokenCount).fill(Math.log(conditionalProbability));
const totalNLL=-logProbabilities.reduce((sum,x)=>sum+x,0),meanNLL=totalNLL/tokenCount;
const perplexity=Math.exp(meanNLL),bitsPerByte=totalNLL/Math.log(2)/totalBytes;
const referenceTokens=4,referencePerplexity=Math.exp(-Math.log(sequenceProbability)/referenceTokens);
const otherTokens=6,otherNLL=otherTokens*Math.log(2);
const pooledPerplexity=Math.exp((totalNLL+otherNLL)/(tokenCount+otherTokens));
const macroMeanPerplexity=(perplexity+Math.exp(otherNLL/otherTokens))/2;
console.log({tokenCount,totalBytes,totalNLL,meanNLL,perplexity,bitsPerByte,sequenceProbability,referenceTokens,referencePerplexity,pooledPerplexity,macroMeanPerplexity});`};
})();
