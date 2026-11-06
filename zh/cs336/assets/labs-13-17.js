/* CS336 data and post-training: explicit contracts and independent numerical models. */
(() => {
  'use strict';
  const {text,line,arrow,rect,node,point,fmt}=window.MLVis;
  const V=window.COURSE_VISUALS ||= {}, C=window.COURSE_CODE ||= {};
  const bar=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${color}"/>`;

  V['cs336-13']={title:'语料清单：保留多少与采样多少是两回事',param:'代码语料的采样概率',min:.1,max:.5,step:.05,value:.25,
    steps:['核对分片的来源与解析版本','排除元数据不完整的分片','指定训练采样混合','计算各来源的期望曝光'],
    render(step,codeShare){
      const availableTokens=[600,300,100],excludedTokens=200,retainedTokens=1000,retainedFraction=1000/1200,trainingBudget=1000;
      const probabilities=[2*(1-codeShare)/3,(1-codeShare)/3,codeShare],expectedExposure=probabilities.map(p=>p*trainingBudget),repeatFactors=expectedExposure.map((x,i)=>x/availableTokens[i]);
      let svg=text(28,28,'所有数量均为 token，不是文档数','v-title');
      const names=['网页','书籍','代码'],colors=['#62a7ef','#50dfc2','#ffe38a'];
      names.forEach((name,i)=>{const y=88+i*71;svg+=text(30,y+15,name)+bar(92,y,availableTokens[i]*.45,25,colors[i])+text(375,y+18,`可用 ${availableTokens[i]}`,'v-small');if(step>=2)svg+=text(500,y+17,`采样 ${fmt(probabilities[i]*100,1)}%`,'v-small');if(step>=3)svg+=text(500,y+44,`曝光 ${fmt(expectedExposure[i],1)} · ${fmt(repeatFactors[i],2)}倍`,'v-small');});
      if(step===0)svg+=text(30,292,'另有网页分片200 tokens缺解析版本，暂不纳入可重建清单。','v-small');
      if(step>=1)svg+=text(30,292,'排除元数据不完整的200 tokens；保留1000/1200 = 83.33%','v-small');
      const body=['清单包含网页600 tokens、缺解析版本的网页200 tokens、书籍300 tokens、代码100 tokens。每个分片都有ID、来源URL、解析版本和token数；元数据完整不等于内容真实或质量合格。','暂不将缺解析版本的200 tokens纳入可重建训练集，得到可用量[600,300,100]。这一过滤针对追溯性；内容质量、许可证条件和重复检测仍需要各自的规则。',`代码采样概率设为${fmt(codeShare)}，其余概率按网页:书籍=2:1分配，得到[${probabilities.map(p=>fmt(p)).join(', ')}]。采样混合是实验选择，不必等于存量比例[0.6,0.3,0.1]。`,`在1000-token有放回训练预算下，期望曝光为[${expectedExposure.map(x=>fmt(x,1)).join(', ')}]。代码可用100 tokens，却期望训练${fmt(expectedExposure[2],1)} tokens，平均曝光${fmt(repeatFactors[2],2)}倍；重复曝光不是新增独特数据。`];
      return {svg,formula:'p=[2(1−c)/3,(1−c)/3,c]；曝光ᵢ=1000pᵢ；平均曝光倍数=曝光ᵢ/可用tokensᵢ',body:body[step],result:`期望曝光=[${expectedExposure.map(x=>fmt(x,1)).join(', ')}] tokens；代码平均曝光=${fmt(repeatFactors[2],2)}倍`,note:'分片token数和期望训练token数使用同一单位。独立有放回采样的期望不表示每次运行恰好相同，也不表示逐条文档重复同样次数。',metrics:{availableTokens,excludedTokens,retainedTokens,retainedFraction,trainingBudget,probabilities,expectedExposure,repeatFactors}};
    }};
  C['cs336-13']={name:'从来源清单到采样计划：追溯过滤与曝光核算',instructions:['先核对被排除的分片及可用token总数。','把codeShare改为0.1或0.5，保持总预算1000 tokens。','比较可用量和期望曝光倍数，解释为何提高重复采样不等于增加独特覆盖。'],expected:'默认可用[600,300,100] tokens，排除200，保留率5/6；混合[.5,.25,.25]，曝光[500,250,250]，代码平均2.5倍曝光。',code:`const shards=[
 {id:'web-a',source:'web',url:'https://example.test/web-a',parserVersion:'v2',tokenCount:600},
 {id:'web-b',source:'web',url:'https://example.test/web-b',parserVersion:null,tokenCount:200},
 {id:'books-a',source:'books',url:'https://example.test/books-a',parserVersion:'v1',tokenCount:300},
 {id:'code-a',source:'code',url:'https://example.test/code-a',parserVersion:'v3',tokenCount:100}
]; // 合成元数据，不访问这些URL。
const eligible=shards.filter(s=>s.url&&s.parserVersion);
const availableTokens=['web','books','code'].map(source=>eligible.filter(s=>s.source===source).reduce((sum,s)=>sum+s.tokenCount,0));
const originalTokens=shards.reduce((sum,s)=>sum+s.tokenCount,0),retainedTokens=availableTokens.reduce((a,b)=>a+b,0);
const codeShare=.25,trainingBudget=1000,probabilities=[2*(1-codeShare)/3,(1-codeShare)/3,codeShare];
const expectedExposure=probabilities.map(p=>p*trainingBudget),repeatFactors=expectedExposure.map((tokens,i)=>tokens/availableTokens[i]);
console.log({availableTokens,excludedTokens:originalTokens-retainedTokens,retainedTokens,retainedFraction:retainedTokens/originalTokens,trainingBudget,probabilities,expectedExposure,repeatFactors});`};

  const docs=[{id:'A',tokens:'a b c d e'.split(' ')},{id:'B',tokens:'a b c d f'.split(' ')},{id:'C',tokens:'a b x y z'.split(' ')}];
  const bigrams=tokens=>new Set(tokens.slice(1).map((token,i)=>tokens[i]+' '+token));
  const sets=docs.map(d=>bigrams(d.tokens));
  const jaccard=(a,b)=>[...a].filter(x=>b.has(x)).length/new Set([...a,...b]).size;
  const pairJaccard={ab:jaccard(sets[0],sets[1]),ac:jaccard(sets[0],sets[2]),bc:jaccard(sets[1],sets[2])};
  V['cs336-14']={title:'近重复：先定义片段，再决定删除阈值',param:'判为近重复的Jaccard阈值',min:.1,max:1,step:.05,value:.6,
    steps:['把三个文档变成二元片段集合','数A与B的交集和并集','比较完整相似度矩阵','按固定顺序保留代表文档'],
    render(step,threshold){
      const kept=[],removed=[];
      docs.forEach((doc,i)=>{if(kept.some(k=>jaccard(sets[k],sets[i])+1e-12>=threshold))removed.push(i);else kept.push(i);});
      let svg=text(28,28,'词级 bigram 集合：重复片段只计一次','v-title');
      docs.forEach((doc,i)=>{svg+=text(32,83+i*56,`${doc.id}: ${doc.tokens.join(' ')}`);if(step>=1)svg+=text(255,83+i*56,[...sets[i]].map(s=>s.replace(' ','·')).join('  '),'v-small');});
      if(step>=1)svg+=text(32,264,'A∩B={a·b,b·c,c·d}；|交|=3，|并|=5','v-small');
      if(step>=2)svg+=text(540,83,`J(A,B)=${fmt(pairJaccard.ab)}`,'v-small')+text(540,139,`J(A,C)=${fmt(pairJaccard.ac)}`,'v-small')+text(540,195,`J(B,C)=${fmt(pairJaccard.bc)}`,'v-small');
      if(step>=3)svg+=text(32,309,`阈值 ${fmt(threshold,2)}：保留 ${kept.map(i=>docs[i].id).join(', ')}；移除 ${removed.map(i=>docs[i].id).join(', ')||'无'}`);
      const body=['按空格分词，取连续两个词作为shingle，并将重复片段压成集合。A的片段是ab、bc、cd、de；B把最后一个改为df；C只有ab与它们共享。这里没有运行语义编码器或MinHash。','A与B交集3个，合并后并集5个，因此J=3/5=0.6。分母不是两个集合大小之和8，因为共同片段在并集中只计一次。','A与C、B与C都只共享ab，并集各7个，相似度1/7≈0.142857。Jaccard描述所选片段的重合度，不直接判断文本的事实、许可或语义价值。',`按A、B、C顺序做贪心去重：若当前文档与已保留代表的相似度≥${fmt(threshold,2)}就移除。结果保留${kept.map(i=>docs[i].id).join(', ')}，移除${removed.map(i=>docs[i].id).join(', ')||'无'}。次序与代表策略也是数据处理配置，应记录下来。`];
      return {svg,formula:'J(A,B)=|S_A∩S_B|/|S_A∪S_B|；本例J(A,B)=3/5，J(A,C)=1/7',body:body[step],result:`保留[${kept.map(i=>docs[i].id).join(', ')}]；移除[${removed.map(i=>docs[i].id).join(', ')}]`,note:'执行精确Jaccard和固定顺序贪心去重。MinHash/LSH可用于大规模候选检索，但本实验没有实现它们；评测去污染仍需单独检查。',metrics:{threshold,pairJaccard,intersectionAB:3,unionAB:5,uniqueShingleCounts:sets.map(s=>s.size),keptIds:kept.map(i=>docs[i].id),removedIds:removed.map(i=>docs[i].id)}};
    }};
  C['cs336-14']={name:'精确bigram Jaccard：观察阈值改变保留集合',instructions:['手列A、B的片段交集与并集。','将threshold从0.6改为0.65和0.1，解释每次删除的依据。','改变文档处理顺序，讨论为什么去重规则需要保存代表选择策略。'],expected:'默认J(A,B)=0.6，J(A,C)=J(B,C)=1/7；阈值0.6保留A/C并移除B，0.65全保留，0.1仅保留A。',code:`const documents=[{id:'A',text:'a b c d e'},{id:'B',text:'a b c d f'},{id:'C',text:'a b x y z'}],threshold=.6;
const shingles=text=>{const tokens=text.split(/\\s+/);return new Set(tokens.slice(1).map((word,i)=>tokens[i]+' '+word));};
const sets=documents.map(d=>shingles(d.text));
const similarity=(a,b)=>[...a].filter(x=>b.has(x)).length/new Set([...a,...b]).size;
const kept=[],removed=[];
documents.forEach((doc,i)=>{if(kept.some(j=>similarity(sets[j],sets[i])+1e-12>=threshold))removed.push(i);else kept.push(i);});
console.log({threshold,pairJaccard:{ab:similarity(sets[0],sets[1]),ac:similarity(sets[0],sets[2]),bc:similarity(sets[1],sets[2])},
 intersectionAB:[...sets[0]].filter(x=>sets[1].has(x)).length,unionAB:new Set([...sets[0],...sets[1]]).size,
 uniqueShingleCounts:sets.map(s=>s.size),keptIds:kept.map(i=>documents[i].id),removedIds:removed.map(i=>documents[i].id)});`};

  const targetRoles=['user','user','assistant','assistant','assistant','pad'],targetProbabilities=[.8,.5,.25,.5,.8,.9];
  const sft=count=>{
    let ordinal=0;const mask=targetRoles.map(role=>role==='assistant'?Number(++ordinal<=count):0),targetCount=mask.reduce((a,b)=>a+b,0);
    const tokenNll=targetProbabilities.map(p=>-Math.log(p)),sumNll=tokenNll.reduce((s,nll,i)=>s+mask[i]*nll,0),maskedLoss=sumNll/targetCount;
    const allNonPadLoss=tokenNll.slice(0,5).reduce((a,b)=>a+b,0)/5,wrongFullLengthLoss=sumNll/targetRoles.length;
    const targetLogitGradients=targetProbabilities.map((p,i)=>mask[i]*(p-1)/targetCount);
    return {mask,targetCount,tokenNll,sumNll,maskedLoss,allNonPadLoss,wrongFullLengthLoss,targetLogitGradients};
  };
  V['cs336-15']={title:'SFT：目标掩码和分母必须一起检查',param:'参与监督的回答目标数',min:1,max:3,step:1,value:3,
    steps:['先对齐下一词预测的目标位置','标记回答目标，排除用户与padding','只累计选中目标的负对数概率','按有效目标数平均并核对梯度'],
    render(step,count){
      const r=sft(Math.round(count));let svg=text(28,28,'图中已是右移对齐后的目标位置，不是输入位置','v-title');
      const labels=['用户1','用户2','回答1','回答2','回答3','PAD'];
      labels.forEach((label,i)=>{const x=28+i*120;svg+=node(x,64,104,label,`p=${targetProbabilities[i]}`,step>=1&&Boolean(r.mask[i]));if(step>=1)svg+=text(x+52,160,`mask=${r.mask[i]}`,'v-center v-small');if(step>=2)svg+=text(x+52,203,fmt(r.mask[i]*r.tokenNll[i],4),'v-center');if(step>=3)svg+=text(x+52,245,fmt(r.targetLogitGradients[i],4),'v-center v-small');});
      if(step>=2)svg+=text(28,287,`有效NLL之和=${fmt(r.sumNll,6)}；目标数=${r.targetCount}；平均=${fmt(r.maskedLoss,6)}`,'v-small');
      if(step>=3)svg+=text(28,317,'最下行：对正确目标logit的直接损失梯度；未监督位置为0。','v-small');
      const body=['设已做完causal shift，六个目标依次属于用户、用户、回答、回答、回答、padding；模型对各正确目标的概率是[.8,.5,.25,.5,.8,.9]。真正实现时先用输入前缀预测下一目标，再根据目标角色建立mask。',`本例只监督回答部分，并可把回答截断为前${Math.round(count)}个目标。当前mask=[${r.mask.join(', ')}]；用户文本仍可作为上下文，但没有自己的直接预测损失。mask不意味着所有与用户上下文有关的模型参数都没有梯度。`,`对选中目标累计−lnp，得到${fmt(r.sumNll,6)}。默认三个回答的和为ln4+ln2+ln1.25=ln10；padding的概率即使很高，也不应参与均值。`,`除以有效目标数${r.targetCount}，损失为${fmt(r.maskedLoss,6)}。若错误地除以总长6，将得到${fmt(r.wrongFullLengthLoss,6)}，同一示例仅因padding长度而改变学习尺度。正确目标logit的偏导是mask·(p−1)/有效数。`];
      return {svg,formula:'L=Σ m_t(−lnp_t)/Σm_t；∂L/∂z_t,true=m_t(p_t−1)/Σm_t',body:body[step],result:`mask=[${r.mask.join(', ')}]；正确均值=${fmt(r.maskedLoss,6)}；误除总长=${fmt(r.wrongFullLengthLoss,6)}`,note:'社区SFT实现细化：给定正确目标概率，仅演示损失与mask。未执行语言模型训练；真实批次全部mask为0时应跳过或显式处理。',metrics:r};
    }};
  C['cs336-15']={name:'assistant-only损失：检查shift、mask和有效分母',instructions:['确认roles表示已右移对齐的目标，而不是直接给输入位置贴标签。','将answerTargetLimit设为1、2、3，核对哪些NLL参与训练。','比较正确均值、混入用户目标的均值与误除总长；解释padding不应改变损失尺度。'],expected:'默认mask=[0,0,1,1,1,0]，sumNll=ln10，loss≈0.767528364；混入用户目标均值≈0.643775165；误除总长6≈0.383764182。',code:`const targetRoles=['user','user','assistant','assistant','assistant','pad'];
const targetProbabilities=[.8,.5,.25,.5,.8,.9],answerTargetLimit=3;
// targets已经与前一个位置的预测对齐。实际训练先shift，再按target角色构造mask。
let assistantIndex=0;
const mask=targetRoles.map(role=>role==='assistant'?Number(++assistantIndex<=answerTargetLimit):0);
const targetCount=mask.reduce((a,b)=>a+b,0);
if(targetCount===0)throw new Error('没有有效监督目标：应跳过批次或显式处理');
const tokenNll=targetProbabilities.map(p=>-Math.log(p));
const sumNll=tokenNll.reduce((sum,nll,i)=>sum+mask[i]*nll,0),maskedLoss=sumNll/targetCount;
const allNonPadLoss=tokenNll.slice(0,5).reduce((a,b)=>a+b,0)/5,wrongFullLengthLoss=sumNll/targetRoles.length;
const targetLogitGradients=targetProbabilities.map((p,i)=>mask[i]*(p-1)/targetCount);
console.log({mask,targetCount,tokenNll,sumNll,maskedLoss,allNonPadLoss,wrongFullLengthLoss,targetLogitGradients});`};

  const standardize=rewards=>{const mean=rewards.reduce((a,b)=>a+b,0)/rewards.length,variance=rewards.reduce((s,r)=>s+(r-mean)**2,0)/rewards.length,std=Math.sqrt(variance),denominator=Math.max(std,1e-8);return {mean,variance,std,denominator,advantages:rewards.map(r=>(r-mean)/denominator)};};
  V['cs336-16']={title:'组相对优势：验证器错误也会被放大成信号',param:'故意放宽的答案容差',min:0,max:2,step:1,value:1,
    steps:['采样同一道精确答案题的四份回答','按验证器容差产生奖励','计算组内均值和人口标准差','标准化优势并对照严格验收'],
    render(step,tolerance){
      const answers=[4,4,5,6],target=4,observedRewards=answers.map(a=>Number(Math.abs(a-target)<=tolerance)),strictRewards=answers.map(a=>Number(a===target)),stats=standardize(observedRewards),strict=standardize(strictRewards);
      const rewardRate=stats.mean,trueSuccessRate=.5,falseAccepts=observedRewards.reduce((s,r,i)=>s+Number(r===1&&strictRewards[i]===0),0);
      let svg=text(28,28,'任务要求精确答案4；候选回答为[4,4,5,6]','v-title');
      answers.forEach((answer,i)=>{const x=35+i*182;svg+=node(x,64,150,`候选 ${i+1}`,`答案 ${answer}`,Boolean(strictRewards[i]));if(step>=1)svg+=text(x+75,165,`奖励 ${observedRewards[i]}`,'v-center');if(step>=2)svg+=text(x+75,210,`中心化 ${fmt(observedRewards[i]-stats.mean)}`,'v-center v-small');if(step>=3)svg+=text(x+75,255,`优势 ${fmt(stats.advantages[i],4)}`,'v-center');});
      if(step>=2)svg+=text(30,301,`组均值=${fmt(stats.mean)}；人口std=${fmt(stats.std,6)}；真实通过率50%，误接收${falseAccepts}份`,'v-small');
      const body=['四份回答来自同一精确数值任务，正确目标为4。两份输出4正确，输出5、6都错误。可验证奖励仍依赖验证器契约，不能把实现的接受条件当作任务本身。',`故意允许绝对误差≤${tolerance}，得到奖励[${observedRewards.join(', ')}]，其中误接收${falseAccepts}份。这个整数答案任务不应有非零容差；设置滑杆是为了暴露奖励错配。`,`奖励均值为${fmt(stats.mean)}，人口方差使用组大小G=4作分母，std=${fmt(stats.std,6)}。本例约定分母max(std,10⁻⁸)，并不使用样本标准差或其他epsilon放置规则。`,`标准化后优势为[${stats.advantages.map(a=>fmt(a,4)).join(', ')}]。容差1时错误答案5得到正优势；容差2时全部奖励为1，优势全为0。严格验证则给[1,1,0,0]，优势[1,1,−1,−1]。归一化无法修复奖励定义。`];
      return {svg,formula:'A_i=(r_i−r̄)/max(s_pop,10⁻⁸)；s_pop²=Σ(r_i−r̄)²/G',body:body[step],result:`奖励=[${observedRewards.join(', ')}]；优势=[${stats.advantages.map(a=>fmt(a,4)).join(', ')}]；误接收=${falseAccepts}`,note:'仅展示GRPO类方法的组优势构造，不包含概率比、clip、KL或完整策略更新。任务是精确算术，容差用于演示故意不合格的验证器。',metrics:{observedRewards,mean:stats.mean,variance:stats.variance,std:stats.std,denominator:stats.denominator,advantages:stats.advantages,strictRewards,strictAdvantages:strict.advantages,rewardRate,trueSuccessRate,falseAccepts}};
    }};
  C['cs336-16']={name:'验证器与组优势：检验错误奖励和零方差分支',instructions:['默认容差1时，指出哪份错误回答得到正优势。','改成容差0和2，核对严格验收与全同奖励的零方差处理。','另给四个全失败奖励做归一化，解释没有组内差异为何缺少这一类学习信号。'],expected:'默认奖励[1,1,1,0]，mean=.75、人口std=√3/4，优势[1/√3,1/√3,1/√3,−√3]。容差0为[1,1,−1,−1]；容差2优势全0。',code:`const answers=[4,4,5,6],target=4,tolerance=1;
const observedRewards=answers.map(a=>Number(Math.abs(a-target)<=tolerance));
const strictRewards=answers.map(a=>Number(a===target));
function standardize(rewards){
 const mean=rewards.reduce((a,b)=>a+b,0)/rewards.length;
 const variance=rewards.reduce((s,r)=>s+(r-mean)**2,0)/rewards.length; // 人口方差
 const std=Math.sqrt(variance),denominator=Math.max(std,1e-8);
 return {mean,variance,std,denominator,advantages:rewards.map(r=>(r-mean)/denominator)};
}
const stats=standardize(observedRewards),strict=standardize(strictRewards);
const falseAccepts=observedRewards.reduce((s,r,i)=>s+Number(r===1&&strictRewards[i]===0),0);
console.log({observedRewards,...stats,strictRewards,strictAdvantages:strict.advantages,rewardRate:stats.mean,
 trueSuccessRate:strict.mean,falseAccepts});
console.log('全失败组优势',standardize([0,0,0,0]).advantages);`};

  V['cs336-17']={title:'多模态批次：长回答怎样影响训练权重？',param:'长度权重指数 α',min:0,max:1,step:.1,value:.5,
    steps:['分别统计有监督的目标token','计算每个示例的平均损失','用长度指数分配批权重','核对整体损失与单token权重'],
    render(step,alpha){
      const lengths=[4,16],meanTokenLoss=[.5,1],rawWeights=lengths.map(n=>n**alpha),weightSum=rawWeights.reduce((a,b)=>a+b,0),weights=rawWeights.map(w=>w/weightSum),loss=weights.reduce((s,w,i)=>s+w*meanTokenLoss[i],0),perTokenGradients=weights.map((w,i)=>w/lengths[i]);
      let svg=text(28,28,'两条示例：文本回答4 tokens，图文回答16 tokens','v-title');
      const labels=['纯文本示例','图文示例'];
      lengths.forEach((n,i)=>{const y=95+i*110;svg+=text(30,y-17,labels[i]);for(let t=0;t<n;t++)svg+=bar(30+t*24,y,19,26,i?'#50dfc2':'#62a7ef');if(step>=1)svg+=text(440,y+18,`平均NLL=${meanTokenLoss[i]}`,'v-small');if(step>=2)svg+=text(440,y+50,`权重 ${fmt(weights[i]*100,2)}%`,'v-small');});
      if(step>=3)svg+=text(30,305,`批损失=${fmt(loss,6)}；每目标token系数=[${perTokenGradients.map(x=>fmt(x,6)).join(', ')}]`,'v-small');
      const body=['长度只统计有监督的输出目标：文本回答4个，图文回答16个。图像patch是条件输入，不直接冒充语言交叉熵中的目标token。先处理有效标签与padding，再讨论跨示例的权重。','给定两条示例的平均token负对数似然分别0.5和1，总NLL分别2和16。若不说明归一化，单看批次损失无法判断长样本贡献了多少。',`本社区例子定义w_i=L_i^α/ΣL_j^α。当前α=${fmt(alpha,1)}，权重为[${weights.map(w=>fmt(w,4)).join(', ')}]。α=0让每个示例等权，α=1等同于所有有效目标token等权，α=0.5介于两者之间。`,`整体损失Σw_i·平均NLL=${fmt(loss,6)}。对某个单token损失的系数为w_i/L_i，分别${perTokenGradients.map(x=>fmt(x,6)).join('、')}。这里的系数是对单token损失值的偏导，不是网络参数梯度。改变加权约定会改变学习目标，是否改善多模态效果必须用受控实验验证。`];
      return {svg,formula:'w_i=L_i^α/ΣL_j^α；L_batch=Σw_i·meanNLL_i；∂L_batch/∂ℓ_it=w_i/L_i',body:body[step],result:`权重=[${weights.map(w=>fmt(w,4)).join(', ')}]；批损失=${fmt(loss,6)}；α=0/1时分别0.75/0.9`,note:'原讲义提及长多模态数据的损失平衡；这里明确自定L^α归一化约定，不冒称某真实模型完整训练公式。未运行多模态编码器。',metrics:{lengths,meanTokenLoss,rawWeights,weights,loss,perTokenGradients}};
    }};
  C['cs336-17']={name:'比较按示例、平方根长度和按token加权的批损失',instructions:['先算两条示例的总NLL与平均NLL。','将alpha设为0、0.5、1，记录批权重与整体损失。','核对每个token的系数；说明为什么图像输入patch数不能直接代替监督目标长度。'],expected:'α=.5时原始权重[2,4]、归一化[1/3,2/3]、批损失5/6≈.833333；每目标token系数[1/12,1/24]。α=0时为0.75，α=1时为0.9。',code:`// length只统计监督目标token；视觉patch是条件输入，不在这里冒充语言标签。
const examples=[{kind:'text',length:4,meanTokenLoss:.5},{kind:'image-text',length:16,meanTokenLoss:1}],alpha=.5;
const lengths=examples.map(x=>x.length),meanTokenLoss=examples.map(x=>x.meanTokenLoss);
const rawWeights=lengths.map(n=>n**alpha),sum=rawWeights.reduce((a,b)=>a+b,0);
const weights=rawWeights.map(w=>w/sum);
const loss=weights.reduce((s,w,i)=>s+w*meanTokenLoss[i],0);
const perTokenGradients=weights.map((w,i)=>w/lengths[i]);
console.log({lengths,meanTokenLoss,rawWeights,weights,loss,perTokenGradients});`};
})();
