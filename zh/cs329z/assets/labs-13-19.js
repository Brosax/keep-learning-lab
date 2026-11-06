/* CS329Z: synthetic local harnesses. No files, messages, network calls or real agents are executed. */
(() => {
  'use strict';
  const {text,line,arrow,rect,node,point,fmt}=window.MLVis;
  const V=window.COURSE_VISUALS ||= {},C=window.COURSE_CODE ||= {};
  const runs=[{id:'A',rows:[1,2,3],calls:3},{id:'B',rows:[],calls:1},{id:'C',rows:[3,1,2],calls:2},{id:'D',rows:[1,2,2,3],calls:2},{id:'E',rows:[1,2,3],calls:6},{id:'F',environmentReady:false,rows:null,calls:0}];
  const contract=(run,budget)=>{
    if(run.environmentReady===false)return {id:run.id,status:'environment_failure',success:false,checks:null,calls:run.calls};
    const rows=run.rows,checks={exists:Array.isArray(rows),content:Array.isArray(rows)&&[1,2,3].every(x=>rows.includes(x))&&rows.every(x=>[1,2,3].includes(x)),sorted:Array.isArray(rows)&&rows.every((x,i)=>i===0||rows[i-1]<=x),unique:Array.isArray(rows)&&new Set(rows).size===rows.length};
    const diagnosticAverage=Object.values(checks).filter(Boolean).length/4,withinBudget=run.calls<=budget,success=Object.values(checks).every(Boolean)&&withinBudget;
    return {id:run.id,status:'completed',checks,calls:run.calls,diagnosticAverage,withinBudget,success};
  };
  V['cs329z-13']={title:'成功契约：四项断言与预算必须同时满足',param:'每次运行允许的工具调用数',min:1,max:6,step:1,value:4,
    steps:['固定产物、验收项与运行预算','逐项检查内容而非自报成功','按逻辑AND判定完整任务','单列环境故障再报告分母'],
    render(step,budget){
      const results=runs.map(r=>contract(r,Math.round(budget))),completeRuns=results.filter(r=>r.status==='completed').length,environmentFailures=results.length-completeRuns,taskSuccessCount=results.filter(r=>r.success).length,successRate=taskSuccessCount/completeRuns,endToEndSuccessRate=taskSuccessCount/results.length;
      let svg=text(28,28,'产物ID必须恰为{1,2,3}、升序、无重复','v-title')+text(30,61,'运行 / 产物','v-small')+text(335,61,'存在  内容  升序  唯一','v-small')+text(600,61,'调用 / 结论','v-small');
      runs.forEach((r,i)=>{const y=91+i*34,out=results[i];svg+=text(30,y,`${r.id}  ${r.rows===null?'环境未启动':'['+r.rows.join(',')+']'}`,'v-small');if(step>=1&&out.checks)Object.values(out.checks).forEach((ok,j)=>{svg+=`<circle cx="${350+j*56}" cy="${y-5}" r="7" fill="${ok?'#50dfc2':'#ed91a5'}"/>`;});if(step>=2)svg+=text(600,y,`${r.calls} / ${out.status==='environment_failure'?'环境失败':out.success?'成功':'失败'}`,'v-small');});
      if(step>=3)svg+=text(30,320,`条件成功 ${taskSuccessCount}/${completeRuns}；端到端成功 ${taskSuccessCount}/${results.length}；环境故障 ${environmentFailures}/${results.length}`,'v-small');
      const body=['固定六条合成记录。A/E的内容正确但调用数不同，B为空数组，C未排序，D有重复，F环境未启动。所有记录只是内存数组，不读取或写入CSV文件。','四项断言分别检查存在、ID集合、升序和唯一性。空数组对“有序”和“唯一”可能真空成立，但内容断言失败，所以不能仅凭几个绿色检查点宣布完成。',`任务成功要求四项全部为真且calls≤${Math.round(budget)}。B/C/D各满足3/4内容断言，诊断均值75%，却都未履行完整契约；均值用于定位问题，不替代AND门槛。`,`预先约定环境故障单列，任务分母使用5条已完成运行，成功率为${fmt(successRate*100,0)}%；全部尝试的端到端成功率为${fmt(endToEndSuccessRate*100,2)}%，并报告1/6环境故障，避免隐藏无法启动的任务。不同基准可以另定分母，必须事先声明。`];
      return {svg,formula:'Success = Exists ∧ Content ∧ Sorted ∧ Unique ∧ (calls≤budget)',body:body[step],result:`成功=${taskSuccessCount}/${completeRuns}；端到端=${taskSuccessCount}/${results.length}；环境故障=${environmentFailures}/${results.length}；预算=${Math.round(budget)}`,note:'合成评测契约演示，不是运行真实Agent得到的成绩。诊断断言均值和完整任务成功是不同指标。',metrics:{budget:Math.round(budget),results,completeRuns,environmentFailures,taskSuccessCount,successRate,endToEndSuccessRate}};
    }};
  C['cs329z-13']={name:'可执行任务契约：空产物与预算超限都不能蒙混过关',instructions:['运行六条合成记录，找出空数组为何仍能通过部分断言。','把budget改成2、4、6，核对任务成功与环境失败的分母。','增加一个看似正确的错误产物，先测试评分器能否识别，再讨论如何评价Agent。'],expected:'预算4时仅A成功，已完成条件成功率1/5=20%、全部尝试端到端1/6≈16.67%，另有1/6环境故障；预算6时A/E成功2/5，预算2时0/5。',code:`const budget=4;
const runs=[{id:'A',rows:[1,2,3],calls:3},{id:'B',rows:[],calls:1},{id:'C',rows:[3,1,2],calls:2},{id:'D',rows:[1,2,2,3],calls:2},{id:'E',rows:[1,2,3],calls:6},{id:'F',environmentReady:false,rows:null,calls:0}];
const results=runs.map(run=>{
 if(run.environmentReady===false)return {id:run.id,status:'environment_failure',success:false};
 const rows=run.rows,checks={exists:Array.isArray(rows),content:Array.isArray(rows)&&[1,2,3].every(x=>rows.includes(x))&&rows.every(x=>[1,2,3].includes(x)),sorted:Array.isArray(rows)&&rows.every((x,i)=>i===0||rows[i-1]<=x),unique:Array.isArray(rows)&&new Set(rows).size===rows.length};
 const withinBudget=run.calls<=budget;
 return {id:run.id,status:'completed',checks,withinBudget,diagnosticAverage:Object.values(checks).filter(Boolean).length/4,success:Object.values(checks).every(Boolean)&&withinBudget};
});
const completeRuns=results.filter(r=>r.status==='completed').length,environmentFailures=results.length-completeRuns,taskSuccessCount=results.filter(r=>r.success).length;
console.log({results,completeRuns,environmentFailures,taskSuccessCount,successRate:taskSuccessCount/completeRuns,endToEndSuccessRate:taskSuccessCount/results.length});`};

  const information=cost=>{
    const prior=.4,sensitivity=.8,falsePositive=.25,positiveProbability=prior*sensitivity+(1-prior)*falsePositive,negativeProbability=1-positiveProbability;
    const positivePosterior=prior*sensitivity/positiveProbability,negativePosterior=prior*(1-sensitivity)/negativeProbability;
    const noExperimentValue=Math.max(6,12*prior),positiveDecisionValue=Math.max(6,12*positivePosterior),negativeDecisionValue=Math.max(6,12*negativePosterior);
    const afterInformation=positiveProbability*positiveDecisionValue+negativeProbability*negativeDecisionValue,evsi=afterInformation-noExperimentValue,perfectInformation=prior*12+(1-prior)*6,evpi=perfectInformation-noExperimentValue,netGain=evsi-cost;
    return {positiveProbability,negativeProbability,positivePosterior,negativePosterior,noExperimentValue,positiveDecisionValue,negativeDecisionValue,afterInformation,evsi,perfectInformation,evpi,cost,netGain,worthTesting:netGain>1e-12};
  };
  V['cs329z-14']={title:'课前问题框架：一个小试验值不值得做？',param:'试验成本（同一效用单位）',min:0,max:2,step:.1,value:.5,
    steps:['把当前决定写成两项方案','定义试验能提供的证据','按试验结果重新选择方案','扣除成本并保留假设边界'],
    render(step,cost){
      const r=information(cost);let svg=text(28,28,'社区决策算例；不代表对谈内容或嘉宾观点','v-title');
      if(step===0)svg+=node(75,92,255,'方案 A','确定效用 6',true)+node(425,92,255,'方案 B','40%得12；60%得0')+text(75,235,'不做试验：E[B]=4.8，选择A，价值6。');
      else {svg+=node(25,131,175,'做一次小试验',`成本 ${fmt(cost,2)}`,true)+arrow(204,151,320,92)+arrow(204,173,320,228)+node(330,58,185,'阳性：概率0.47','选B，期望8.170')+node(330,192,185,'阴性：概率0.53','选A，效用6');if(step>=2)svg+=text(550,106,'信息后价值 7.02')+text(550,150,'EVSI = 1.02')+text(550,194,'完美信息上界 2.40','v-small');if(step>=3)svg+=text(550,250,`净收益 ${fmt(r.netGain,2)}`)+text(30,312,r.worthTesting?'在此合成假设下，试验收益超过成本。':'在此合成假设下，试验不足以覆盖成本。','v-small');}
      const body=['A确定得到6单位效用；B在“高收益状态”得12，否则得0，高收益先验概率0.4。不做试验时B的期望4.8小于A的6，所以选择A。先写决策，再问什么证据会改变它。','假设试验在高收益状态下80%阳性，在低收益状态下25%误报。阳性概率0.47；阳性后的高收益概率为0.32/0.47，阴性后为0.08/0.53。这些是人为设定的工程假设。','阳性时B的期望约8.170，选B；阴性时B的期望约1.811，选A。信息后的期望效用为0.47×8.170+0.53×6=7.02，所以样本信息价值EVSI=1.02；完美信息价值2.4仅是上界。',`扣除成本${fmt(cost,2)}，净收益${fmt(r.netGain,2)}。当成本超过1.02，这个试验按当前假设不值得做。应追问先验、收益和试验准确性有何依据，不把算例或未来对谈标题当作已经获得的观点证据。`];
      return {svg,formula:'EVSI=E_试验结果[max_方案 E(效用|结果)]−max_方案 E(效用)；净收益=EVSI−成本',body:body[step],result:`EVSI=${fmt(r.evsi,2)}；成本=${fmt(cost,2)}；净收益=${fmt(r.netGain,2)}`,note:'对谈尚未公开，本实验是独立社区课前活动。效用、先验和试验准确性全部为合成假设，未归于任何嘉宾。',metrics:r};
    }};
  C['cs329z-14']={name:'计算信息价值：用具体决策组织课前提问',instructions:['不做试验时，先比较A的6与B的期望4.8。','核对阳性/阴性后最优选择及总期望7.02。','修改experimentCost，找到何时不值得试验；再列出需要向实际项目收集的证据。'],expected:'EVSI=1.02、EVPI=2.4；默认成本0.5，净收益0.52；成本高于1.02时不再值得做。',code:`// 全部数值是假设的社区练习，不是Andrew Ng的观点或对谈记录。
const prior=.4,sensitivity=.8,falsePositive=.25,experimentCost=.5,safeValue=6,upside=12;
const positiveProbability=prior*sensitivity+(1-prior)*falsePositive,negativeProbability=1-positiveProbability;
const positivePosterior=prior*sensitivity/positiveProbability,negativePosterior=prior*(1-sensitivity)/negativeProbability;
const noExperimentValue=Math.max(safeValue,upside*prior);
const positiveDecisionValue=Math.max(safeValue,upside*positivePosterior),negativeDecisionValue=Math.max(safeValue,upside*negativePosterior);
const afterInformation=positiveProbability*positiveDecisionValue+negativeProbability*negativeDecisionValue;
const evsi=afterInformation-noExperimentValue,perfectInformation=prior*upside+(1-prior)*safeValue,evpi=perfectInformation-noExperimentValue,netGain=evsi-experimentCost;
console.log({positiveProbability,negativeProbability,positivePosterior,negativePosterior,noExperimentValue,positiveDecisionValue,negativeDecisionValue,afterInformation,evsi,perfectInformation,evpi,cost:experimentCost,netGain,worthTesting:netGain>1e-12});`};

  const judge=bias=>{
    const differences=[2,-1,1,-2],human=[1,-1,1,-1],rawAB=differences.map(d=>d+bias),rawBA=differences.map(d=>-d+bias),orientedBA=rawBA.map(x=>-x),corrected=rawAB.map((x,i)=>(x-rawBA[i])/2),biasEstimates=rawAB.map((x,i)=>(x+rawBA[i])/2);
    const oneOrderTies=rawAB.filter(x=>x===0).length,swappedTies=orientedBA.filter(x=>x===0).length;
    const oneOrderAWins=rawAB.filter(x=>x>0).length,swappedAWins=orientedBA.filter(x=>x>0).length,correctedAWins=corrected.filter(x=>x>0).length,humanAgreement=corrected.filter((x,i)=>Math.sign(x)===human[i]).length/4,orderDisagreements=rawAB.filter((x,i)=>Math.sign(x)!==Math.sign(orientedBA[i])).length;
    return {differences,rawAB,rawBA,orientedBA,corrected,biasEstimates,oneOrderAWins,swappedAWins,correctedAWins,oneOrderTies,swappedTies,humanAgreement,orderDisagreements};
  };
  V['cs329z-15']={title:'模型裁判：交换位置后，偏好还属于同一答案吗？',param:'第一位置的加性分数偏差 b',min:0,max:3,step:.25,value:1.5,
    steps:['固定四对答案与人工参照','以AB顺序取得分数差','交换顺序并统一回A减B','消除加性位置项再核对人工参照'],
    render(step,bias){
      const r=judge(bias),px=x=>360+x*42;let svg=text(28,28,'分数差正值偏好A，负值偏好B；0为平局','v-title')+line(px(0),58,px(0),282,'v-axis');
      r.differences.forEach((d,i)=>{const y=92+i*53;svg+=text(30,y+5,`样例${i+1} 人工:${d>0?'A':'B'}`,'v-small');if(step>=1)svg+=point(px(r.rawAB[i]),y,6)+text(610,y+5,`AB ${fmt(r.rawAB[i],2)}`,'v-small');if(step>=2)svg+=line(px(r.rawAB[i]),y,px(r.orientedBA[i]),y,'v-edge')+point(px(r.orientedBA[i]),y,6,'v-history');if(step>=3)svg+=`<rect x="${px(r.corrected[i])-5}" y="${y-5}" width="10" height="10" fill="#62a7ef"/>`;});
      if(step>=2)svg+=text(30,301,'黄：AB的A−B；绿：交换后转回A−B；蓝方：双顺序校正','v-small');
      const body=['预设四对内容质量差d=[2,−1,1,−2]，人工参照偏好为[A,B,A,B]。这是已知答案的合成校准集，允许检查位置偏差估计是否实现正确，不能当真实人类研究结果。',`假设裁判固定给第一位置额外b=${fmt(bias,2)}，AB顺序的“第一减第二”分数为d+b。当前A赢${r.oneOrderAWins}/4、平局${r.oneOrderTies}；0分记平局，不算任何一方赢。内容没变，排序因素已影响表面胜率。`,`交换成BA时，裁判原始“第一减第二”为−d+b，必须先取负号转回A−B，得到d−b。此时A赢${r.swappedAWins}/4；若不统一候选方向就直接平均，反而会抹去真实内容差。`,`校正差=(rawAB−rawBA)/2=d；估计位置项=(rawAB+rawBA)/2=b。默认两组顺序有${r.orderDisagreements}/4偏好不一致，校正后与预设人工参照一致。真实裁判的偏差未必可加、对称或稳定，交换顺序不等于已经消除全部偏差。`];
      return {svg,formula:'s_AB=d+b；s_BA=−d+b；d̂=(s_AB−s_BA)/2；b̂=(s_AB+s_BA)/2',body:body[step],result:`单顺序A赢=${r.oneOrderAWins}/4；交换后=${r.swappedAWins}/4；校正后=${r.correctedAWins}/4`,note:'采用明确的合成加性偏差模型。真实评估仍需人工校准、独立证据与争议复核，不能把校正后的分数自动当真理。',metrics:r};
    }};
  C['cs329z-15']={name:'双顺序评分：先对齐候选身份，再估计位置偏差',instructions:['先打印AB和BA的原始“第一减第二”差值。','把BA转回A−B，比较两次胜者，再计算校正差。','改变firstPositionBias，检查何者应变化；构造非加性偏差说明此校正的局限。'],expected:'默认AB差[3.5,.5,2.5,−.5]，交换后转回A−B为[.5,−2.5,−.5,−3.5]；校正为[2,−1,1,−2]，估计bias全1.5。',code:`const differences=[2,-1,1,-2],human=[1,-1,1,-1],firstPositionBias=1.5;
const rawAB=differences.map(d=>d+firstPositionBias),rawBA=differences.map(d=>-d+firstPositionBias);
const orientedBA=rawBA.map(x=>-x);
const corrected=rawAB.map((x,i)=>(x-rawBA[i])/2),biasEstimates=rawAB.map((x,i)=>(x+rawBA[i])/2);
const oneOrderAWins=rawAB.filter(x=>x>0).length,swappedAWins=orientedBA.filter(x=>x>0).length,correctedAWins=corrected.filter(x=>x>0).length;
const humanAgreement=corrected.filter((x,i)=>Math.sign(x)===human[i]).length/4;
const orderDisagreements=rawAB.filter((x,i)=>Math.sign(x)!==Math.sign(orientedBA[i])).length;
const oneOrderTies=rawAB.filter(x=>x===0).length,swappedTies=orientedBA.filter(x=>x===0).length;
console.log({differences,rawAB,rawBA,orientedBA,corrected,biasEstimates,oneOrderAWins,swappedAWins,correctedAWins,oneOrderTies,swappedTies,humanAgreement,orderDisagreements});`};

  const failToPass=['new-empty','new-cap'],passToPass=['existing-mid','existing-negative','existing-zero'];
  const benchmark=(results,{environmentReady=true,patchApplied=true}={})=>{
    if(!environmentReady)return {status:'environment_failure',resolved:false};
    const required=[...failToPass,...passToPass],missing=required.filter(id=>!Object.hasOwn(results,id)),fixPassed=failToPass.filter(id=>results[id]===true).length,regressionPassed=passToPass.filter(id=>results[id]===true).length;
    return {status:'evaluated',requiredTests:required.length,executed:required.length-missing.length,missing,coverageComplete:missing.length===0,patchApplied,fixPassed,regressionPassed,totalPassed:fixPassed+regressionPassed,fixPassFraction:fixPassed/2,regressionPassFraction:regressionPassed/3,totalPassFraction:(fixPassed+regressionPassed)/5,resolved:patchApplied&&missing.length===0&&fixPassed===2&&regressionPassed===3};
  };
  V['cs329z-16']={title:'仓库修复评测：修好新问题，还要守住旧行为',param:'3项回归测试中的通过数',min:0,max:3,step:1,value:2,
    steps:['固定失败转通过与保持通过两组测试','确认两项修复测试已经通过','检查原有回归与测试完整性','同时通过门槛才记为resolved'],
    render(step,passed){
      const after=Object.fromEntries([...failToPass.map(id=>[id,true]),...passToPass.map((id,i)=>[id,i<Math.round(passed)])]),r=benchmark(after),missingResults={...after};delete missingResults['existing-zero'];const missingCase=benchmark(missingResults),missingExecutedPassRate=Object.values(missingResults).filter(Boolean).length/Object.keys(missingResults).length;
      let svg=text(28,28,'固定基线：F2P原先失败；P2P原先通过','v-title')+text(30,67,'测试契约','v-small')+text(355,67,'修复前','v-small')+text(535,67,'修复后','v-small');
      [...failToPass,...passToPass].forEach((id,i)=>{const y=105+i*39;svg+=text(30,y,id,'v-small')+text(365,y,i<2?'失败':'通过','v-small');if(step>=1&&i<2||step>=2)svg+=arrow(420,y-6,510,y-6,after[id]?'v-teal':'v-yellow')+text(535,y,after[id]?'通过':'失败','v-small');});
      if(step>=3)svg+=text(30,320,`总通过 ${r.totalPassed}/5；缺测试不能忽略；resolved=${r.resolved?'true':'false'}`,'v-small');
      const body=['FAIL_TO_PASS有new-empty、new-cap两项，修复前失败；PASS_TO_PASS有三项，修复前已通过。评测固定起始版本、测试列表与预期，不能由补丁自己删改验收条件。','合成结果中两项修复测试都通过。它说明需求的一部分已修好，却还没有检查是否破坏原来可用的行为。',`当前回归通过${r.regressionPassed}/3，总通过${r.totalPassed}/5。删除existing-zero的结果后，必须记录missing=[existing-zero]，而不是只对剩下的已执行测试计算一个漂亮比例。`,`resolved要求补丁已应用、测试记录完整、F2P全通过、P2P全通过。当前为${r.resolved}。环境不能启动单列environment_failure；本例只是检查合成测试结果的harness，没有执行SWE-bench任务或公布该基准成绩。`];
      return {svg,formula:'resolved = Applied ∧ CompleteResults ∧ all(F2P_after) ∧ all(P2P_after)',body:body[step],result:`F2P=${r.fixPassed}/2；P2P=${r.regressionPassed}/3；resolved=${r.resolved}；删测试仍不通过`,note:'纯内存合成评测harness。通过这些有限测试是有限证据，不证明补丁对所有输入正确；环境错误另行分类。',metrics:{...r,missingCase,missingExecutedPassRate}};
    }};
  C['cs329z-16']={name:'合成SWE式harness：回归失败与缺失测试都阻止验收',instructions:['默认修复2/2、回归2/3，解释为何总通过80%仍不能resolved。','将regressionPasses改为3，核对完整门槛。','删除一条测试结果或将environmentReady设为false，检查状态分类是否准确。'],expected:'默认总4/5通过但resolved=false；回归3/3时true。删除existing-zero后缺失必失败，即使其余已执行测试全通过。',code:`const failToPass=['new-empty','new-cap'],passToPass=['existing-mid','existing-negative','existing-zero'],regressionPasses=2;
function evaluate(results,{environmentReady=true,patchApplied=true}={}){
 if(!environmentReady)return {status:'environment_failure',resolved:false};
 const required=[...failToPass,...passToPass],missing=required.filter(id=>!Object.hasOwn(results,id));
 const fixPassed=failToPass.filter(id=>results[id]===true).length,regressionPassed=passToPass.filter(id=>results[id]===true).length;
 return {status:'evaluated',requiredTests:required.length,executed:required.length-missing.length,missing,coverageComplete:missing.length===0,patchApplied,fixPassed,regressionPassed,totalPassed:fixPassed+regressionPassed,fixPassFraction:fixPassed/2,regressionPassFraction:regressionPassed/3,totalPassFraction:(fixPassed+regressionPassed)/5,resolved:patchApplied&&missing.length===0&&fixPassed===2&&regressionPassed===3};
}
const after=Object.fromEntries([...failToPass.map(id=>[id,true]),...passToPass.map((id,i)=>[id,i<regressionPasses])]);
const missingResults={...after};delete missingResults['existing-zero'];
console.log({...evaluate(after),missingCase:evaluate(missingResults),missingExecutedPassRate:Object.values(missingResults).filter(Boolean).length/Object.keys(missingResults).length});
console.log('环境失败分类',evaluate(after,{environmentReady:false}));`};

  const proposals=[{id:'A',origin:'user-plan',action:'read',path:'/course/notes.txt'},{id:'B',origin:'retrieval',action:'write',path:'/course/drafts/x'},{id:'C',origin:'user-plan',action:'read',path:'/private/x'},{id:'D',origin:'user-plan',action:'read',path:'/course/../private/x'},{id:'E',origin:'user-plan',action:'write',path:'/course/drafts/x'},{id:'F',origin:'user-plan',action:'read',path:'/course-old/x'}];
  const canonical=path=>{if(!path.startsWith('/')||/[\\%\0]/.test(path))return null;const parts=[];for(const part of path.split('/')){if(!part||part==='.')continue;if(part==='..'){if(!parts.length)return null;parts.pop();}else parts.push(part);}return '/'+parts.join('/');};
  const authorize=(proposal,allowDraftWrite)=>{
    const canonicalPath=canonical(proposal.path);let reason;
    if(proposal.origin!=='user-plan')reason='不可信来源不能授予动作';
    else if(!canonicalPath)reason='路径格式不支持';
    else if(proposal.action==='read'&&canonicalPath.startsWith('/course/'))return {...proposal,canonicalPath,allowed:true,reason:'用户任务范围内读取'};
    else if(proposal.action==='write'&&allowDraftWrite&&canonicalPath.startsWith('/course/drafts/'))return {...proposal,canonicalPath,allowed:true,reason:'授权范围内草稿写入'};
    else reason='超出能力或规范化路径范围';
    return {...proposal,canonicalPath,allowed:false,reason};
  };
  V['cs329z-17']={title:'信任边界：来源标记不能被检索内容改写',param:'模拟任务是否授权草稿写入（0/1）',min:0,max:1,step:1,value:0,
    steps:['把外部内容与任务授权分开','先规范化路径再检查边界','按操作类型和范围检查能力','记录决定，不执行真实动作'],
    render(step,allow){
      const decisions=proposals.map(p=>authorize(p,Boolean(Math.round(allow)))),allowedCount=decisions.filter(d=>d.allowed).length,deniedCount=decisions.length-allowedCount;
      let svg=text(28,28,'只读/course/；可选写入仅限/course/drafts/','v-title')+text(28,65,'提案 / 来源 / 操作','v-small')+text(285,65,step>=1?'规范化后的目标':'原始目标','v-small')+text(625,65,'决定','v-small');
      proposals.forEach((p,i)=>{const y=97+i*35;svg+=text(28,y,`${p.id} ${p.origin==='retrieval'?'外部数据':'任务计划'} ${p.action}`,'v-small')+text(285,y,step>=1?decisions[i].canonicalPath||'不支持':p.path,'v-small');if(step>=2)svg+=text(625,y,decisions[i].allowed?'允许':'拒绝','v-small');});
      if(step>=3)svg+=text(28,320,`允许 ${allowedCount}，拒绝 ${deniedCount}；仅返回内存决定，没有访问文件或发送内容。`,'v-small');
      const body=['提案B来自检索数据；即使内容声称“系统允许写入”，也不能改变宿主赋予的来源标签或授权。origin必须由可信执行框架传入，不能取自外部文本自己填写的字段。','先按本例的明确路径规则消去.与..，D的/course/../private/x会变成/private/x；F的/course-old/x也不属于/course/。不能只对未经规范化的字符串做模糊前缀匹配。',`用户计划可读取/course/中的内容；草稿写入开关现在为${Math.round(allow)}，即使开启也只允许/course/drafts/。外部数据来源不能直接发起动作，仍然被拒绝。真实系统需在受信执行层实施等效检查。`,`本例允许${allowedCount}条、拒绝${deniedCount}条，只生成审计对象。它没有访问文件、调用工具或外发数据；也不声称仅靠这几个规则能防住所有注入。路径协议在此限制为不含转义、反斜杠和空字节的绝对路径。`];
      return {svg,formula:'Allow = TrustedOrigin ∧ SupportedCanonicalPath ∧ Capability(action,path)',body:body[step],result:`允许=${allowedCount}/6；外部提案B始终拒绝；路径穿越D与前缀陷阱F拒绝`,note:'所有动作仅在内存中判定。来源标签由宿主控制，外部数据不能自报可信；实际工具还需处理平台自己的路径、权限与竞态规则。',metrics:{decisions,allowedCount,deniedCount,externalDenied:!decisions[1].allowed,traversalDenied:!decisions[3].allowed,prefixTrapDenied:!decisions[5].allowed}};
    }};
  C['cs329z-17']={name:'来源与权限检查：用无副作用提案测试信任边界',instructions:['观察retrieval来源即使目标在草稿目录内也不能自行授予写权限。','开启allowDraftWrite，只让授权计划的E通过，B仍应拒绝。','核对路径穿越与/course-old/前缀陷阱，不把字符串相似当成目录范围。'],expected:'默认仅A允许，1/6；开启草稿写入后A/E允许，2/6。B、D、F始终拒绝；所有动作只生成内存日志。',code:`const allowDraftWrite=false;
// origin由宿主提供，绝不能从检索文本中读出并自授可信级别。
const proposals=[{id:'A',origin:'user-plan',action:'read',path:'/course/notes.txt'},{id:'B',origin:'retrieval',action:'write',path:'/course/drafts/x'},{id:'C',origin:'user-plan',action:'read',path:'/private/x'},{id:'D',origin:'user-plan',action:'read',path:'/course/../private/x'},{id:'E',origin:'user-plan',action:'write',path:'/course/drafts/x'},{id:'F',origin:'user-plan',action:'read',path:'/course-old/x'}];
function canonical(path){
 if(!path.startsWith('/')||/[\\\\%\\0]/.test(path))return null;
 const parts=[];for(const part of path.split('/')){if(!part||part==='.')continue;if(part==='..'){if(!parts.length)return null;parts.pop();}else parts.push(part);}return '/'+parts.join('/');
}
const decisions=proposals.map(p=>{
 const canonicalPath=canonical(p.path);
 const trusted=p.origin==='user-plan';
 const capability=canonicalPath&&(p.action==='read'&&canonicalPath.startsWith('/course/')||p.action==='write'&&allowDraftWrite&&canonicalPath.startsWith('/course/drafts/'));
 return {...p,canonicalPath,allowed:Boolean(trusted&&capability)};
});
const allowedCount=decisions.filter(d=>d.allowed).length;
console.log({decisions,allowedCount,deniedCount:decisions.length-allowedCount,externalDenied:!decisions[1].allowed,traversalDenied:!decisions[3].allowed,prefixTrapDenied:!decisions[5].allowed});
console.log('此程序只记录决定，不读写路径，也不发送任何消息。');`};

  const buggyClamp=(value,min,max)=>Math.max(min,value),fixedClamp=(value,min,max)=>Math.min(max,Math.max(min,value)),userChangedClamp=(value,min,max)=>Math.max(min+1,value);
  const clampTests=[{name:'下界',args:[-2,0,10],expected:0},{name:'区间内',args:[5,0,10],expected:5},{name:'上界',args:[12,0,10],expected:10},{name:'零宽区间',args:[0,0,0],expected:0}];
  const verifyClamp=fn=>clampTests.map(t=>({...t,actual:fn(...t.args),passed:fn(...t.args)===t.expected}));
  const patchExercise=state=>{
    const current={revision:state===1?'rev-2':'rev-1',implementation:state===2?userChangedClamp:buggyClamp};
    const before=verifyClamp(current.implementation),revisionMatches=current.revision==='rev-1',implementationMatches=current.implementation===buggyClamp,patchApplied=revisionMatches&&implementationMatches;
    const next=patchApplied?{revision:'rev-1-fixed',implementation:fixedClamp}:current,after=verifyClamp(next.implementation);
    return {state,revisionMatches,implementationMatches,patchApplied,beforePasses:before.filter(t=>t.passed).length,afterPasses:after.filter(t=>t.passed).length,totalTests:4,before,after};
  };
  V['cs329z-18']={title:'可验证修改：先核对基线，再替换函数实现',param:'基线状态（0原始 / 1版本变化 / 2用户已改）',min:0,max:2,step:1,value:0,
    steps:['复现clamp遗漏上界的缺陷','校验版本与预期实现','只在基线匹配时替换函数','实际执行边界与回归测试'],
    render(step,state){
      const r=patchExercise(Math.round(state));let svg=text(28,28,'真实执行小函数；补丁与状态只存在内存中','v-title')+text(28,69,'旧：max(min,v)；修复：min(max,max(min,v))','v-small');
      if(step>=1)svg+=node(30,95,205,'版本匹配',String(r.revisionMatches),r.revisionMatches)+node(277,95,205,'实现匹配',String(r.implementationMatches),r.implementationMatches);
      if(step>=2)svg+=arrow(486,128,535,128)+node(548,95,185,'应用替换',String(r.patchApplied),r.patchApplied);
      if(step>=3)r.after.forEach((t,i)=>{const x=28+i*185;svg+=node(x,204,170,t.name,`${t.actual} / 期望${t.expected}`,t.passed);});
      svg+=text(28,310,step>=3?`修改前 ${r.beforePasses}/4；修改后 ${r.afterPasses}/4；拒绝基线不匹配时保留当前实现。`:'先检查复现与基线，再执行最小替换。','v-small');
      const body=['clamp(v,min,max)应该把值限制在闭区间。旧函数Math.max(min,v)只处理下界：v=12、区间[0,10]时返回12，暴露上界缺陷。其余测试包括负值、区间内值和零宽区间。',`当前版本匹配=${r.revisionMatches}，实现匹配=${r.implementationMatches}。版本已变或用户已经修改实现时，不应盲目覆盖；真正仓库中需检查提交、文件内容与补丁上下文。`,`两项基线检查都成立才将内存中的函数引用替换为预定义修复实现。当前patchApplied=${r.patchApplied}。这里没有eval、动态编译或修改磁盘源码，验证执行的是实际JavaScript函数。`,`实际运行四个边界/回归测试，修改前${r.beforePasses}/4、之后${r.afterPasses}/4。拒绝替换不是“修好了”，应报告基线冲突；通过四个测试也只证明这些输入，不能概括所有契约或真实仓库行为。`];
      return {svg,formula:'Apply = RevisionMatches ∧ ExpectedImplementationMatches；clamp(v,l,u)=min(u,max(l,v))',body:body[step],result:`patchApplied=${r.patchApplied}；before=${r.beforePasses}/4；after=${r.afterPasses}/4`,note:'内存中的版本/函数替换教学模型，确实调用函数和测试；没有修改真实仓库，也不解释执行任意源码。',metrics:r};
    }};
  C['cs329z-18']={name:'给clamp做真实回归测试，并拒绝覆盖变化的基线',instructions:['默认状态复现上界失败，检查替换后四个测试全过。','把baselineState改成1或2，核对拒绝替换与保留当前实现。','新增一个测试，再说明真实仓库还需哪些版本、上下文与需求检查。'],expected:'状态0：应用修复，3/4→4/4；状态1版本变化：拒绝，仍3/4；状态2用户已改实现：拒绝，仍1/4。',code:`const buggyClamp=(v,min,max)=>Math.max(min,v);
const fixedClamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const userChangedClamp=(v,min,max)=>Math.max(min+1,v);
const tests=[{name:'下界',args:[-2,0,10],expected:0},{name:'区间内',args:[5,0,10],expected:5},{name:'上界',args:[12,0,10],expected:10},{name:'零宽区间',args:[0,0,0],expected:0}],baselineState=0;
const current={revision:baselineState===1?'rev-2':'rev-1',implementation:baselineState===2?userChangedClamp:buggyClamp};
const verify=fn=>tests.map(t=>{const actual=fn(...t.args);return {...t,actual,passed:actual===t.expected};});
const before=verify(current.implementation),revisionMatches=current.revision==='rev-1',implementationMatches=current.implementation===buggyClamp;
const patchApplied=revisionMatches&&implementationMatches;
const next=patchApplied?{revision:'rev-1-fixed',implementation:fixedClamp}:current,after=verify(next.implementation);
console.log({state:baselineState,revisionMatches,implementationMatches,patchApplied,beforePasses:before.filter(t=>t.passed).length,afterPasses:after.filter(t=>t.passed).length,totalTests:4,before,after});`};

  const events=[{id:'a',minute:0,score:.9,authorized:true},{id:'a',minute:5,score:.95,authorized:true},{id:'b',minute:12,score:.8,authorized:true},{id:'c',minute:40,score:.6,authorized:true},{id:'d',minute:70,score:.95,authorized:true},{id:'e',minute:80,score:.99,authorized:false},{id:'f',minute:100,score:.85,authorized:true}];
  const proactive=threshold=>{
    const seen=new Set(),records=[],actions=[],counts={duplicate:0,belowThreshold:0,unauthorized:0,cooldown:0,acted:0};let lastActionMinute=null;
    for(const event of events){let outcome;if(seen.has(event.id))outcome='duplicate';else{seen.add(event.id);if(event.score+1e-12<threshold)outcome='belowThreshold';else if(!event.authorized)outcome='unauthorized';else if(lastActionMinute!==null&&event.minute-lastActionMinute<30)outcome='cooldown';else{outcome='acted';lastActionMinute=event.minute;actions.push(event.id);}}counts[outcome]++;records.push({...event,outcome});}
    return {threshold,cooldownMinutes:30,actions,counts,records,lastActionMinute};
  };
  V['cs329z-19']={title:'主动建议：事件去重、置信阈值与冷却共同作用',param:'生成本地建议草稿的阈值',min:.5,max:.95,step:.05,value:.75,
    steps:['按时间读取已标识的事件','先去重，再看置信度与授权','用冷却限制重复打扰','记录草稿及每条跳过原因'],
    render(step,threshold){
      const r=proactive(threshold);let svg=text(28,28,'仅生成内存草稿；没有真实通知或外部动作','v-title')+line(50,111,710,111,'v-axis');
      const labels={duplicate:'重复',belowThreshold:'低于阈值',unauthorized:'无授权',cooldown:'冷却',acted:'草稿'};
      r.records.forEach((e,i)=>{const x=65+i*103;svg+=point(x,111,8,step>=3&&e.outcome==='acted'?'v-history':'v-dot')+text(x,81,`${e.id} / t${e.minute}`,'v-center v-small')+text(x,148,fmt(e.score,2),'v-center v-small');if(step>=1)svg+=text(x,185,labels[e.outcome],'v-center v-small');});
      if(step>=2)svg+=text(30,240,'冷却30分钟：仅成功生成草稿时更新计时；相差恰好30分钟允许。','v-small');
      if(step>=3)svg+=text(30,285,`草稿事件 [${r.actions.join(', ')}]；共 ${r.actions.length} 条`)+text(30,317,`重复${r.counts.duplicate} / 低分${r.counts.belowThreshold} / 无授权${r.counts.unauthorized} / 冷却${r.counts.cooldown}`,'v-small');
      const body=['事件按分钟排序并带稳定ID，第二条a是同一事件的重投递。置信度是合成预测分数，authorized只表示是否获准生成本地建议草稿，不授予发信或改计划能力。',`先将已处理ID去重，再检查score≥${fmt(threshold,2)}和草稿授权。原事件即使低于阈值，也已被处理；同ID重投递不因此变成新意图。真实修订事件应有明确版本策略。`,'上一次确实生成草稿后30分钟内不再生成新草稿。被去重、低分或无授权的事件不刷新这个时钟；时间差等于30分钟时允许。先检查授权，再检查冷却，以便日志准确记录原因。',`当前草稿来自[${r.actions.join(', ')}]。默认阈值0.75时为a、d、f；阈值0.5会增加c，阈值0.95仅保留d。更少草稿不自动等于更高价值，还需测量有用率、漏掉的重要机会和用户打扰。`];
      return {svg,formula:'Draft = NewEvent ∧ score≥τ ∧ Authorized ∧ (无上次草稿 ∨ Δt≥30min)',body:body[step],result:`草稿=[${r.actions.join(', ')}]；数量=${r.actions.length}；未授权事件e始终不执行`,note:'所有事件、授权字段和操作都是内存模拟，只记录draft动作；分数不是用户授权，也没有发送通知、编辑日程或访问外部系统。',metrics:r};
    }};
  C['cs329z-19']={name:'运行事件状态机：幂等、冷却与授权各守一条规则',instructions:['默认阈值0.75，逐条解释a重投递、b冷却、c低分、e无授权。','把threshold改为0.5和0.95，比较草稿事件集合。','检查f与上次草稿相隔恰好30分钟；增加一个新版本事件时明确ID策略。'],expected:'默认草稿[a,d,f]；阈值0.5为[a,c,d,f]，阈值0.95仅[d]。重复a和未授权e始终不增加草稿。',code:`const threshold=.75,cooldownMinutes=30;
const events=[{id:'a',minute:0,score:.9,authorized:true},{id:'a',minute:5,score:.95,authorized:true},{id:'b',minute:12,score:.8,authorized:true},{id:'c',minute:40,score:.6,authorized:true},{id:'d',minute:70,score:.95,authorized:true},{id:'e',minute:80,score:.99,authorized:false},{id:'f',minute:100,score:.85,authorized:true}];
const seen=new Set(),records=[],actions=[],counts={duplicate:0,belowThreshold:0,unauthorized:0,cooldown:0,acted:0};let lastActionMinute=null;
for(const event of events){
 let outcome;
 if(seen.has(event.id))outcome='duplicate';
 else{
  seen.add(event.id);
  if(event.score+1e-12<threshold)outcome='belowThreshold';
  else if(!event.authorized)outcome='unauthorized';
  else if(lastActionMinute!==null&&event.minute-lastActionMinute<cooldownMinutes)outcome='cooldown';
  else{outcome='acted';lastActionMinute=event.minute;actions.push(event.id);} // 仅内存草稿ID
 }
 counts[outcome]++;records.push({...event,outcome});
}
console.log({threshold,cooldownMinutes,actions,counts,records,lastActionMinute});`};
})();
