/* CME295 04–06: preference objective, affine quantization, and retry semantics. */
(() => {
  'use strict';
  const {text,line,arrow,rect,node,point,fmt}=window.MLVis;
  const V=window.COURSE_VISUALS ||= {},C=window.COURSE_CODE ||= {};
  V['cme295-04']={title:'DPO：比较的是相对参考模型的偏好变化',param:'DPO 系数 β',min:0,max:2,step:.25,value:1,steps:['固定一对偏好答案与参考概率','分别计算两个模型的对数比','减去参考偏好，再乘 β','对成对损失求导'],render(step,beta){
    const policyLogRatio=Math.log(3),referenceLogRatio=Math.log(1.5),relativeLogRatio=Math.log(2),margin=beta*relativeLogRatio;
    const preferenceProbability=1/(1+Math.exp(-margin)),loss=Math.log1p(Math.exp(-margin)),gradientLogRatio=-beta/(1+Math.exp(margin));
    let svg=text(26,29,'同一提示：偏好答案 w，较差答案 l；参考模型固定','v-title');
    svg+=node(30,65,205,'当前策略 πθ','P(w)=.6，P(l)=.2',step===0)+node(30,175,205,'参考策略 πref','P(w)=.3，P(l)=.2',step===0);
    svg+=arrow(240,98,295,98)+arrow(240,208,295,208);
    svg+=node(310,65,185,'当前 log-odds',step>=1?`ln 3 = ${fmt(policyLogRatio,3)}`:'ln(.6/.2)',step===1)+node(310,175,185,'参考 log-odds',step>=1?`ln 1.5 = ${fmt(referenceLogRatio,3)}`:'ln(.3/.2)',step===1);
    if(step>=2){svg+=arrow(500,99,550,142)+arrow(500,208,550,172)+node(565,125,165,'相对 margin',`${fmt(beta,2)} × ln 2`,step===2);}
    svg+=text(28,287,`L = ${fmt(loss,6)} · 偏好模型分数 = ${fmt(preferenceProbability,6)}`);
    if(step===3)svg+=text(28,315,`∂L/∂相对 log-ratio = ${fmt(gradientLogRatio,6)}`,'v-small');
    const bodies=[
      '偏好数据告诉我们w优于l。当前模型对二者给出0.6和0.2，固定参考模型给出0.3和0.2；剩余概率属于其他答案，所以这不是只有两个答案的归一化分布。DPO使用离线成对偏好，不需要在这一步显式采样在线奖励。',
      '当前策略更偏向w的对数比为ln(.6/.2)=ln3；参考模型原本就偏向w，对数比为ln(.3/.2)=ln1.5。只看当前模型的绝对概率，无法判断相对于参考模型改变了多少。',
      `相对log-ratio为ln3−ln1.5=ln2，乘β=${fmt(beta,2)}得到margin=${fmt(margin,6)}。sigmoid(margin)是这个成对偏好模型的分数，不是模型输出w的概率，更不是独立评测的成功率。`,
      `损失L=−logσ(margin)=${fmt(loss,6)}，对相对log-ratio的导数为−βσ(−margin)=${fmt(gradientLogRatio,6)}。负号推动相对偏好向w移动；真正的参数梯度还需乘log-ratio对模型参数的导数。β=0时此例没有训练信号。`
    ];
    return {svg,formula:'r=log[πθ(w)/πθ(l)]−log[πref(w)/πref(l)]；L=−logσ(βr)；∂L/∂r=−βσ(−βr)',body:bodies[step],result:`r=ln2 · βr=${fmt(margin,6)} · loss=${fmt(loss,6)} · gradient=${fmt(gradientLogRatio,6)}`,note:'社区数值扩展：固定一对答案，仅演示DPO目标。完整语言模型使用序列log概率；偏好噪声与长度效应仍需检查。',metrics:{beta,policyLogRatio,referenceLogRatio,relativeLogRatio,margin,preferenceProbability,loss,gradientLogRatio}};
  }};
  C['cme295-04']={name:'DPO 算例：参考偏好怎样进入损失与梯度',instructions:['先计算当前与参考模型各自的对数概率比。','改变beta为0、1、2，观察损失与对log-ratio的导数。','改变referenceChosen，解释为什么当前策略概率不变时DPO目标仍会变化。'],expected:'β=1：相对log-ratio=ln2，偏好模型分数2/3，loss=ln1.5≈.405465，gradient=−1/3。β=2：loss=ln1.25，gradient=−.4。',code:`const policyChosen=.6,policyRejected=.2,referenceChosen=.3,referenceRejected=.2,beta=1;
const policyLogRatio=Math.log(policyChosen)-Math.log(policyRejected);
const referenceLogRatio=Math.log(referenceChosen)-Math.log(referenceRejected);
const relativeLogRatio=policyLogRatio-referenceLogRatio,margin=beta*relativeLogRatio;
const preferenceProbability=1/(1+Math.exp(-margin));
// softplus(-margin) gives the stable negative log-sigmoid loss.
const loss=Math.max(-margin,0)+Math.log1p(Math.exp(-Math.abs(margin)));
const gradientLogRatio=-beta/(1+Math.exp(margin));
console.log({beta,policyLogRatio,referenceLogRatio,relativeLogRatio,margin,preferenceProbability,loss,gradientLogRatio});`};

  V['cme295-05']={title:'分组量化：低位宽之外，还要支付尺度和零点的成本',param:'无符号整数位宽 b',min:2,max:8,step:1,value:2,steps:['为一组权重选择整数刻度','舍入并裁剪到合法整数','反量化后逐项计算误差','把分组元数据也计入内存'],render(step,bits){
    const values=[-1,-.2,.66,2],qmax=2**bits-1,scale=3/qmax,zeroPoint=Math.round(1/scale);
    const codes=values.map(x=>Math.max(0,Math.min(qmax,Math.round(x/scale)+zeroPoint)));
    const reconstructed=codes.map(q=>scale*(q-zeroPoint));
    const mse=values.reduce((s,x,i)=>s+(x-reconstructed[i])**2,0)/4;
    const packedWeightBytes=Math.ceil(4*bits/8),metadataBytes=5,totalBytes=packedWeightBytes+metadataBytes,baselineBytes=16,compression=baselineBytes/totalBytes;
    let svg=text(26,29,'同一组权重：[−1, −0.2, 0.66, 2]','v-title');
    svg+=text(28,66,`scale = ${fmt(scale,6)} · zero-point = ${zeroPoint} · 整数范围 [0,${qmax}]`,'v-small');
    values.forEach((value,i)=>{const x=28+i*183;svg+=node(x,91,155,`权重 ${value}`,step>=1?`q = ${codes[i]}`:'待量化',step===1);if(step>=2){svg+=arrow(x+77,161,x+77,185)+node(x,194,155,`还原 ${fmt(reconstructed[i],4)}`,`误差 ${fmt(reconstructed[i]-value,4)}`,step===2);}});
    svg+=text(28,301,step===3?`权重 ${packedWeightBytes} B + 元数据 5 B = ${totalBytes} B；FP32原始16 B`:`反量化均方误差 MSE = ${fmt(mse,8)}`,'v-title');
    const bodies=[
      `本例使用一组4个权重，最小−1、最大2。b=${bits}位无符号整数有0到${qmax}的刻度，scale=(2−(−1))/(2^b−1)，zero-point=round(−min/scale)。零点表示实数0对应哪个整数，不必等于0。`,
      `按明确规则 q=clamp(round(x/scale)+zero-point,0,qmax) 得到[${codes.join(', ')}]。这里采用JavaScript Math.round的舍入约定；生产量化需要与目标内核的round/clamp规则一致。`,
      `反量化为scale×(q−zero-point)，结果[${reconstructed.map(x=>fmt(x,5)).join(', ')}]。MSE=${fmt(mse,8)}。降低位宽造成数值近似，但误差大小取决于范围、异常值和分组方式；不能只凭位宽判断任务质量。`,
      `若理想位打包，4个权重占${packedWeightBytes}字节。再计每组FP32 scale的4字节和uint8 zero-point的1字节，总计${totalBytes}字节，比16字节FP32约压缩${fmt(compression,3)}倍。小组的元数据占比很高，这不是“32/${bits}倍”的理想裸权重比，也不是推理加速倍数。`
    ];
    return {svg,formula:'s=(max−min)/(2^b−1)；z=round(−min/s)；q=clamp(round(x/s)+z)；x̂=s(q−z)',body:bodies[step],result:`MSE=${fmt(mse,8)} · ${totalBytes}/16 B · 压缩 ${fmt(compression,3)}×`,note:'计算用JS双精度，内存按理想位打包和每组5字节元数据估算；未实际打包，也未测GPU速度、对齐开销或FP32尺度舍入。',metrics:{bits,scale,zeroPoint,codes,reconstructed,mse,packedWeightBytes,metadataBytes,totalBytes,baselineBytes,compression}};
  }};
  C['cme295-05']={name:'仿射量化：权重误差与元数据开销一起核算',instructions:['手算2bit的scale、零点和四个整数码。','改为4bit、8bit，比较MSE和含元数据的字节数。','把一个权重改为很大的异常值，观察同组其他权重的分辨率变化。'],expected:'2bit：scale=1，zeroPoint=1，codes=[0,1,2,3]，还原[-1,0,1,2]，MSE=.0389，总6B（原16B）。4bit MSE=.0009；8bit MSE≈3.46e−7。',code:`const values=[-1,-.2,.66,2],bits=2;
const min=Math.min(0,...values),max=Math.max(0,...values),qmax=2**bits-1;
const scale=(max-min)/qmax || 1;
const zeroPoint=Math.max(0,Math.min(qmax,Math.round(-min/scale)));
const codes=values.map(x=>Math.max(0,Math.min(qmax,Math.round(x/scale)+zeroPoint)));
const reconstructed=codes.map(q=>scale*(q-zeroPoint));
const mse=values.reduce((sum,x,i)=>sum+(x-reconstructed[i])**2,0)/values.length;
// Logical packed storage only: JS Number arrays are not bit-packed tensors.
const packedWeightBytes=Math.ceil(values.length*bits/8),metadataBytes=5;
const totalBytes=packedWeightBytes+metadataBytes,baselineBytes=4*values.length;
console.log({bits,scale,zeroPoint,codes,reconstructed,mse,packedWeightBytes,metadataBytes,totalBytes,baselineBytes,compression:baselineBytes/totalBytes});`};

  V['cme295-06']={title:'响应丢了，操作可能已执行：Agent 重试如何避免重复生效？',param:'成功执行后丢失的响应数',min:0,max:3,step:1,value:1,steps:['模型提出一个逻辑操作','执行器写入结果，但响应丢失','客户端用同一操作键重试','对比请求次数与实际生效次数'],render(step,lostAcknowledgements){
    const attempts=lostAcknowledgements+1,unprotectedEffects=attempts,idempotentEffects=1;
    const unprotectedBalance=100+10*attempts,idempotentBalance=110,duplicateRequests=lostAcknowledgements,completed=true;
    let svg=text(26,29,'纯本地模拟：余额100，逻辑操作 job-42 加10','v-title');
    svg+=node(28,64,190,'Agent / 执行器','固定 key=job-42',step===0)+arrow(223,97,282,97)+node(298,64,195,'服务端原子执行','存储 key、参数、结果',step===1)+arrow(499,97,556,97)+node(570,64,162,'响应',lostAcknowledgements?'前几次丢失':'正常收到',step===1);
    if(step>=2){svg+=line(653,138,653,177,'v-yellow')+line(653,177,121,177,'v-yellow')+arrow(121,177,121,137);svg+=text(232,165,`总请求 ${attempts} 次；同一key命中缓存 ${duplicateRequests} 次`,'v-small');}
    svg+=node(80,222,260,'没有幂等保护',step===3?`余额 ${unprotectedBalance} · 生效 ${unprotectedEffects} 次`:'每次重试都会再加10',false)+node(410,222,260,'固定键 + 参数校验',step===3?`余额 ${idempotentBalance} · 生效 1 次`:'重复请求返回已存结果',step===3);
    const bodies=[
      '模型只提出结构化请求，执行器负责验证并执行。这里完全在内存中模拟一次“余额加10”的操作，没有网络请求或真实资产变化。一个逻辑操作生成一个稳定键job-42，重试不会生成新键。',
      `服务器已将余额从100加到110并记录结果，但假设前${lostAcknowledgements}次响应没有被客户端收到。超时只说明客户端不知道结果，不能推出服务器未执行。可靠系统需要查询操作状态或安全地重试。`,
      `客户端最多尝试4次，本例第${attempts}次收到响应。幂等执行器先检查key及参数：已有同key同参数则返回原结果，不重复加10；同key不同参数必须报冲突，不能把另一项操作冒充重试。`,
      `无保护时${attempts}次请求会加${attempts}次，余额${unprotectedBalance}；幂等路径只加一次，余额110。这里假设键记录与副作用原子提交；真实系统还需要持久化、并发控制、过期策略和故障恢复，不能把内存Map等同于无条件“恰好一次”。`
    ];
    return {svg,formula:'请求次数=丢失响应数+1；无保护余额=100+10×请求次数；幂等余额=110',body:bodies[step],result:`请求 ${attempts} 次 · 无保护生效 ${unprotectedEffects} 次 · 幂等生效 1 次 · 最终已收到确认`,note:'社区工程扩展，所有余额都是合成数值。故障位于“服务端提交后、响应送达前”，不是服务器拒绝请求。',metrics:{lostAcknowledgements,attempts,unprotectedBalance,idempotentBalance,unprotectedEffects,idempotentEffects,duplicateRequests,completed}};
  }};
  C['cme295-06']={name:'幂等重试：用同一操作键返回已经提交的结果',instructions:['默认丢失第一次响应，比较两条执行路径的余额。','将 lostAcknowledgements 改成0或3，区分请求次数和生效次数。','保持同一个key、改变amount再调用幂等执行器，确认参数冲突会报错；不同逻辑操作必须用新key。'],expected:'丢失1次响应：请求2次，无保护余额120，幂等余额110且只生效1次。丢失3次：请求4次，无保护140，幂等仍110。',code:`const lostAcknowledgements=1,maxAttempts=4,operationKey='job-42',amount=10;
let unprotectedBalance=100,idempotentBalance=100,unprotectedEffects=0,idempotentEffects=0,duplicateRequests=0;
const completedOperations=new Map();
function executeOnce(key,delta){
  if(completedOperations.has(key)){
    const saved=completedOperations.get(key);
    if(saved.delta!==delta)throw Error('同一个幂等键不能绑定不同参数');
    duplicateRequests++;return saved.result;
  }
  idempotentBalance+=delta;idempotentEffects++;
  // In this single-threaded simulation the effect and record form one atomic step.
  completedOperations.set(key,{delta,result:idempotentBalance});
  return idempotentBalance;
}
let completed=false,attempts=0;
while(attempts<maxAttempts&&!completed){
  attempts++;
  unprotectedBalance+=amount;unprotectedEffects++;
  const result=executeOnce(operationKey,amount);
  const responseDelivered=attempts>lostAcknowledgements;
  console.log({attempt:attempts,result,responseDelivered});
  completed=responseDelivered;
}
console.log({lostAcknowledgements,attempts,unprotectedBalance,idempotentBalance,unprotectedEffects,idempotentEffects,duplicateRequests,completed});
// Try executeOnce(operationKey,20) to check conflicting retry parameters.`};
})();
