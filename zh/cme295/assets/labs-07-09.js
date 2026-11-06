/* CME295 community previews: finite evaluation, synthetic denoising, contrastive alignment. */
(() => {
  'use strict';
  const {text,line,arrow,rect,node,point,fmt}=window.MLVis;
  const V=window.COURSE_VISUALS ||= {}, C=window.COURSE_CODE ||= {};
  const choose=(n,k)=>{if(k<0||k>n)return 0;let r=1;for(let i=1;i<=k;i++)r=r*(n-i+1)/i;return Math.round(r);};
  const softmax=xs=>{const m=Math.max(...xs),e=xs.map(x=>Math.exp(x-m)),z=e.reduce((a,b)=>a+b,0);return e.map(x=>x/z);};

  V['cme295-07']={title:'pass@k：多次尝试中至少一次成功',param:'从候选池抽取的次数 k',min:1,max:10,step:1,value:3,
    steps:['固定已判定的候选池','计算全部失败的子集数','用补事件得到pass@k','同时报告预算与选择限制'],
    render(step,count){
      const n=10,correct=3,k=Math.round(count),failureCombinations=choose(n-correct,k),totalCombinations=choose(n,k),estimate=1-failureCombinations/totalCombinations,iidApprox=1-(1-correct/n)**k,budgetTokens=80*k;
      let svg=text(28,28,'10份候选：3份通过测试，7份失败','v-title');
      for(let i=0;i<10;i++){const x=65+i*65;svg+=`<circle cx="${x}" cy="83" r="19" fill="${i<3?'#50dfc2':'#556176'}"/>`+text(x,89,String(i+1),'v-center v-node-title');}
      svg+=text(38,126,'绿：通过可执行测试；灰：失败。抽样不放回。','v-small');
      if(step>=1)svg+=node(75,164,250,'全部 k 元子集',`C(10,${k}) = ${totalCombinations}`,false)+node(430,164,250,'全部失败的子集',`C(7,${k}) = ${failureCombinations}`,true);
      if(step>=2)svg+=text(38,272,`pass@${k} = 1 − ${failureCombinations}/${totalCombinations} = ${fmt(estimate,6)}`);
      if(step>=3)svg+=text(38,310,`预算示例 ${budgetTokens} tokens；独立有放回近似 ${fmt(iidApprox,6)}，不是同一抽样。`,'v-small');
      const body=['先生成并测试n=10份候选，发现c=3份成功。实验先计算固定候选池中的不放回概率，再用它估计同一生成策略的pass@k；真实生成可以独立重复采样。观察到3/10不表示已知总体单次成功率就是0.3。',`所有等可能的k元子集有C(10,${k})=${totalCombinations}个；全失败必须只从7份错误候选中抽取，有C(7,${k})=${failureCombinations}个。若k>7，全失败子集为0。`,`至少一次成功是“全失败”的补事件，所以估计为${fmt(estimate,6)}。默认k=3时为1−35/120=17/24。这里的pass@k不同于pass^k：后者要求每次都成功，衡量稳定性。`,`假设每份候选恰好80 tokens，部署尝试预算为80k=${budgetTokens}，仅作成本对照。pass@k不保证系统能辨认哪份正确；没有可靠验证器或选择策略时，更高的这个指标不自动变成单次交付成功率。`];
      return {svg,formula:'pass@k = 1 − C(n−c,k)/C(n,k)；n=10，c=3',body:body[step],result:`pass@${k}=${fmt(estimate,6)}；独立近似=${fmt(iidApprox,6)}；示例预算=${budgetTokens} tokens`,note:'固定候选池上的不放回组合估计。pass@k要求至少一次成功；pass^k要求全部成功，不能互换。',metrics:{n,correct,k,failureCombinations,totalCombinations,estimate,iidApprox,budgetTokens}};
    }};
  C['cme295-07']={name:'用组合数核对pass@k，分清成功能力与稳定性',instructions:['先数清10选3的120个子集与7选3的35个全失败子集。','把k改成1、3、8，核对边界及预算。','比较独立有放回近似与不放回估计；解释为何不能把pass@k当作自动选中正确答案的概率。'],expected:'默认 pass@3=17/24≈0.708333；独立近似1−0.7³=0.657。k=1时0.3，k≥8时固定候选池至少含一份成功。',code:`const n=10,correct=3,k=3,tokensPerAttempt=80;
function choose(n,k){if(k<0||k>n)return 0;let product=1;for(let i=1;i<=k;i++)product=product*(n-i+1)/i;return Math.round(product);}
if(k<1||k>n||!Number.isInteger(k))throw new Error('k必须是1至n之间的整数');
const failureCombinations=choose(n-correct,k),totalCombinations=choose(n,k);
const estimate=1-failureCombinations/totalCombinations;
const iidApprox=1-(1-correct/n)**k;
console.log({n,correct,k,failureCombinations,totalCombinations,estimate,iidApprox,budgetTokens:tokensPerAttempt*k});
console.log('pass@k是至少一次成功；若假定独立且p=.3，全部k次成功的pass^k为',(.3)**k);`};

  const targetTokens=['实验','需要','认真','记录','全部','配置'];
  const proposals=[{position:1,token:'需要',confidence:.9},{position:2,token:'重新',confidence:.8},{position:3,token:'记录',confidence:.7},{position:4,token:'部分',confidence:.55}];
  const denoise=count=>{
    const firstLockedCount=Math.round(count),firstLockedPositions=proposals.slice(0,firstLockedCount).map(x=>x.position);
    const initial=targetTokens.map((x,i)=>i===0||i===5?x:'[MASK]');
    const locked=[...initial];for(const item of proposals.slice(0,firstLockedCount))locked[item.position]=item.token;
    const finalTokens=locked.map((token,i)=>token==='[MASK]'?targetTokens[i]:token),wrongPositions=finalTokens.map((t,i)=>t===targetTokens[i]?-1:i).filter(i=>i>=0);
    const remainingMasks=4-firstLockedCount,modelPasses=remainingMasks?2:1;
    return {initial,locked,firstLockedPositions,remainingMasks,finalTokens,wrongPositions,maskedAccuracy:1-wrongPositions.length/4,modelPasses,positionEvaluations:modelPasses*6};
  };
  V['cme295-08']={title:'掩码恢复：高置信错误一旦锁定会怎样？',param:'第一轮锁定的位置数',min:1,max:4,step:1,value:2,
    steps:['保留条件，遮住四个位置','同时提出四个候选','只锁定最高置信的位置','恢复剩余掩码并检查错误'],
    render(step,count){
      const r=denoise(count),candidate=[targetTokens[0],...proposals.map(x=>x.token),targetTokens[5]];
      let svg=text(28,28,'合成调度：第一轮含有高置信错误','v-title');
      const row=(tokens,y,label,confidence=false)=>{
        let out=text(28,y-9,label,'v-small');
        tokens.forEach((token,i)=>{const x=25+i*119,wrong=token!=='[MASK]'&&token!==targetTokens[i],fill=wrong?'#573740':token==='[MASK]'?'#172337':'#173b45';out+=`<rect x="${x}" y="${y}" width="109" height="58" rx="7" fill="${fill}" stroke="${wrong?'#ed91a5':'#40556e'}"/>`+text(x+54.5,y+25,token,'v-center v-node-title');const sub=confidence&&i>0&&i<5?`置信度 ${fmt(proposals[i-1].confidence,2)}`:`位置 ${i}`;out+=text(x+54.5,y+47,sub,'v-center v-small');});return out;
      };
      if(step===0)svg+=row(r.initial,128,'已知两端；待恢复位置1、2、3、4');
      if(step>=1)svg+=row(candidate,65,'第一轮候选（粉色与预设真值不同）',true);
      if(step>=2)svg+=row(r.locked,155,`锁定 ${Math.round(count)} 个最高置信位置，剩余仍为MASK`);
      if(step>=3)svg+=row(r.finalTokens,245,`最终仅补剩余MASK；掩码位置准确率 ${fmt(r.maskedAccuracy*100,0)}%`);
      const body=['目标短句是“实验 / 需要 / 认真 / 记录 / 全部 / 配置”，只保留位置0和5。其余四个位置需要恢复；这不是把token编号当连续语义坐标加高斯噪声。','第一轮合成候选依次为需要(.90)、重新(.80)、记录(.70)、部分(.55)。位置2的高置信“重新”其实错误，置信度排序不保证正确性或校准。',`本策略锁住最高置信的${Math.round(count)}个位置，之后不再允许改写它们。锁定位置为[${r.firstLockedPositions.join(', ')}]，仍有${r.remainingMasks}个掩码。该选择规则只是一个教学日程，不代表所有扩散语言模型。`,`第二轮对剩余MASK使用预先给定的正确合成候选；若没有MASK便跳过这一轮。已锁定错误会保留。最终错误位置[${r.wrongPositions.join(', ')}]，四个原掩码位置准确率${fmt(r.maskedAccuracy*100,0)}%。允许重新遮罩可能修正错误，但需要额外策略、模型评估和计算预算。`];
      const metrics={firstLockedPositions:r.firstLockedPositions,remainingMasks:r.remainingMasks,finalTokens:r.finalTokens,wrongPositions:r.wrongPositions,maskedAccuracy:r.maskedAccuracy,modelPasses:r.modelPasses,positionEvaluations:r.positionEvaluations};
      return {svg,formula:'选择最高置信k个位置 → 锁定；下一轮只填MASK；Accuracy=(4−错误数)/4',body:body[step],result:`错误位置=[${r.wrongPositions.join(', ')}]；原掩码准确率=${fmt(r.maskedAccuracy*100,0)}%；合成前向轮数=${r.modelPasses}`,note:'所有候选和置信度都是预设合成数据，未调用或训练扩散模型；轮数×6仅作位置计算代理，不能当真实延迟。',metrics};
    }};
  C['cme295-08']={name:'运行一个合成去噪日程：比较锁定速度与纠错余地',instructions:['默认先锁2个位置，指出哪个高置信错误被保留。','把firstLockedCount分别改为1、3、4，比较准确率与前向轮数。','尝试允许重掩码，再说明需要什么额外证据才能判断何时撤销锁定。'],expected:'默认锁位置[1,2]，最终错误位置[2]，4个掩码准确率75%；锁1个时100%，锁4个时50%且只执行一轮。',code:`// 以下候选是预先写定的合成数据，不是真实模型输出。
const target=['实验','需要','认真','记录','全部','配置'],firstLockedCount=2;
const proposals=[{position:1,token:'需要',confidence:.90},{position:2,token:'重新',confidence:.80},{position:3,token:'记录',confidence:.70},{position:4,token:'部分',confidence:.55}];
if(!Number.isInteger(firstLockedCount)||firstLockedCount<1||firstLockedCount>4)throw new Error('锁定数需为1至4');
const state=target.map((token,i)=>i===0||i===5?token:'[MASK]');
const chosen=[...proposals].sort((a,b)=>b.confidence-a.confidence).slice(0,firstLockedCount);
for(const item of chosen)state[item.position]=item.token;
console.log('第一轮锁定后',state);
// 第二轮只补仍遮住的位置，预设候选恰好正确；不能改已经锁住的词。
const finalTokens=state.map((token,i)=>token==='[MASK]'?target[i]:token);
const wrongPositions=finalTokens.map((token,i)=>token===target[i]?-1:i).filter(i=>i>=0);
const remainingMasks=4-firstLockedCount,modelPasses=remainingMasks?2:1;
console.log({firstLockedPositions:chosen.map(x=>x.position),remainingMasks,finalTokens,wrongPositions,
 maskedAccuracy:1-wrongPositions.length/4,modelPasses,positionEvaluations:modelPasses*6});`};

  const alignment=temperature=>{
    const similarities=[[.8,.6],[.6,.8]],rowProbabilities=similarities.map(row=>softmax(row.map(s=>s/temperature)));
    const columnProbabilities=[0,1].map(j=>softmax(similarities.map(row=>row[j]/temperature)));
    const imageToTextLoss=-(Math.log(rowProbabilities[0][0])+Math.log(rowProbabilities[1][1]))/2;
    const textToImageLoss=-(Math.log(columnProbabilities[0][0])+Math.log(columnProbabilities[1][1]))/2;
    const loss=(imageToTextLoss+textToImageLoss)/2,similarityGradient=similarities.map((row,i)=>row.map((s,j)=>(rowProbabilities[i][j]+columnProbabilities[j][i]-2*Number(i===j))/(4*temperature)));
    return {similarities,rowProbabilities,columnProbabilities,imageToTextLoss,textToImageLoss,loss,similarityGradient};
  };
  V['cme295-09']={title:'图文对齐：两张图与两段文字的对比损失',param:'温度 τ',min:.05,max:1,step:.05,value:.1,
    steps:['将两种模态映射为单位向量','计算余弦相似度矩阵','分别沿行与列分类','平均两个方向的交叉熵'],
    render(step,temperature){
      const r=alignment(temperature);
      let svg=text(28,28,'正配对为(I₁,T₁)、(I₂,T₂)，其余为批内负对','v-title')+text(128,75,'文字 T₁','v-center')+text(278,75,'文字 T₂','v-center');
      for(let i=0;i<2;i++){svg+=text(28,125+i*95,`I${i+1}`);for(let j=0;j<2;j++){const x=65+j*150,y=92+i*95;svg+=rect(x,y,128,73,i===j?'v-node active':'v-node');svg+=text(x+64,y+29,`cos=${r.similarities[i][j]}`,'v-center');if(step>=2)svg+=text(x+64,y+56,`行p=${fmt(r.rowProbabilities[i][j])}`,'v-center v-small');}}
      if(step===0)svg+=text(420,110,'图像：[1,0]、[0,1]','v-small')+text(420,153,'文字：[.8,.6]、[.6,.8]','v-small')+text(420,196,'四个向量长度均为1','v-small');
      if(step>=1)svg+=text(420,91,`logits = cosine / ${fmt(temperature,2)}`,'v-small');
      if(step>=2)svg+=text(420,139,`正确配对概率 ${fmt(r.rowProbabilities[0][0],6)}`)+text(420,182,`图→文 CE ${fmt(r.imageToTextLoss,6)}`,'v-small')+text(420,220,`文→图 CE ${fmt(r.textToImageLoss,6)}`,'v-small');
      if(step>=3)svg+=text(420,273,`双向平均 L=${fmt(r.loss,6)}`)+text(65,310,'温度只改变此矩阵的分布锐度，不会改变匹配排序。','v-small');
      const body=['两张图的单位向量为(1,0)、(0,1)，两段文字的单位向量为(0.8,0.6)、(0.6,0.8)。图像和文字由各自编码器进入同一比较空间；这里直接给定向量来隔离训练损失。','单位向量的内积就是余弦相似度，得到[[0.8,0.6],[0.6,0.8]]。正确图文配对是对角线，非对角项作为当前小批次的负样本。一个图片按钮本身不提供这种对齐信号。',`把相似度除以τ=${fmt(temperature,2)}后，沿每行做“图选文字”，沿每列做“文字选图”。两方向正确配对概率均为${fmt(r.rowProbabilities[0][0],6)}，但一般非对称矩阵的两个方向未必相同。`,`将两行交叉熵平均、两列交叉熵平均，再平均两方向，得到${fmt(r.loss,6)}。默认τ=0.1时差值为2，正确概率σ(2)≈0.880797，损失ln(1+e^(−2))≈0.126928。更低温度会锐化已有排序，不能修复错误配对或虚假的负样本。`];
      return {svg,formula:'L=½[−½Σᵢ ln softmax(Sᵢ/τ)ᵢ −½Σⱼ ln softmax(S·ⱼ/τ)ⱼ]',body:body[step],result:`图→文=${fmt(r.imageToTextLoss,6)}；文→图=${fmt(r.textToImageLoss,6)}；双向L=${fmt(r.loss,6)}`,note:'CLIP式双向对比学习的社区扩展算例；给定单位向量与两对标签，不执行图像编码或真实多模态训练。',metrics:r};
    }};
  C['cme295-09']={name:'两对图文的双向InfoNCE：核对温度和梯度',instructions:['核对四个向量范数与2×2余弦矩阵。','把temperature从0.1改为1或0.05，比较损失而不改变配对排序。','把正配对标签交换，思考更低温度为什么会加重错误标签的惩罚。'],expected:'τ=0.1时正确概率≈0.880797，两个方向CE及双向平均均≈0.126928；对相似度梯度对角≈−0.596015、非对角≈0.596015。',code:`const images=[[1,0],[0,1]],texts=[[.8,.6],[.6,.8]],temperature=.1;
const normalize=v=>{const norm=Math.hypot(...v);if(!norm)throw new Error('不能归一化零向量');return v.map(x=>x/norm);};
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const imageVectors=images.map(normalize),textVectors=texts.map(normalize);
const similarities=imageVectors.map(image=>textVectors.map(text=>dot(image,text)));
const softmax=xs=>{const max=Math.max(...xs),exps=xs.map(x=>Math.exp(x-max)),sum=exps.reduce((a,b)=>a+b,0);return exps.map(x=>x/sum);};
const rowProbabilities=similarities.map(row=>softmax(row.map(s=>s/temperature)));
const columnProbabilities=[0,1].map(j=>softmax(similarities.map(row=>row[j]/temperature)));
const imageToTextLoss=-(Math.log(rowProbabilities[0][0])+Math.log(rowProbabilities[1][1]))/2;
const textToImageLoss=-(Math.log(columnProbabilities[0][0])+Math.log(columnProbabilities[1][1]))/2;
const loss=(imageToTextLoss+textToImageLoss)/2;
const similarityGradient=similarities.map((row,i)=>row.map((s,j)=>(rowProbabilities[i][j]+columnProbabilities[j][i]-2*Number(i===j))/(4*temperature)));
console.log({similarities,rowProbabilities,columnProbabilities,imageToTextLoss,textToImageLoss,loss,similarityGradient});`};
})();
