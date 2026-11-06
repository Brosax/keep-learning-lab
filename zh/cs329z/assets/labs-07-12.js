/* CS329Z 07–12: local, deterministic simulations; no tools, files, or remote agents are invoked. */
(() => {
  'use strict';
  const {text,line,arrow,rect,node,point,fmt}=window.MLVis;
  const V=window.COURSE_VISUALS ||= {},C=window.COURSE_CODE ||= {};
  const colors=['#62b4ee','#50dfc2','#ffe38a','#e99476'];
  const box=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${h}" rx="3" fill="${color}"/>`;
  V['cs329z-07']={title:'记忆排序之前：权限、删除、过期和版本必须先过关',param:'时间衰减半衰期（天）',min:1,max:14,step:1,value:2,steps:['记录六条候选的来源与状态','先应用不可用条件','同一事实只保留当前版本','在合法候选内计算时间分数'],render(step,halfLife){
    const currentScore=.8*2**(-2/halfLife),recentScore=.7,topId=currentScore>recentScore?'current':'recent';
    const records=[['旧缓存 v1','今天重索引','被v2替代'],['当前事实 v2','2天前验证',`分数${fmt(currentScore,4)}`],['近期流程 v1','今天验证','分数0.7000'],['过期依赖','20天前/TTL7','过期'],['其他项目','scope B','权限不符'],['已删除偏好','status deleted','已撤回']];
    let svg=text(26,29,'衰减只影响排序，不会让失效记录重新获得资格','v-title');
    records.forEach((r,i)=>{const y=68+i*34;svg+=text(30,y,r[0],'v-small')+text(257,y,r[1],'v-small');if(step>=1&&i>=3)svg+=text(510,y,r[2],'v-small');if(step>=2&&i===0)svg+=text(510,y,r[2],'v-small');if(step===3&&(i===1||i===2))svg+=text(510,y,r[2],topId===(i===1?'current':'recent')?'v-title':'v-small');});
    svg+=line(27,265,730,265,'v-axis')+text(28,303,`可检索2条；首位 ${topId==='current'?'当前事实 v2':'近期流程'}；事实版本始终v2`,'v-title');
    const bodies=[
      '六条记录包括同一region事实的v1旧缓存和v2当前事实、近期build流程、过期依赖、其他项目记录、已删除偏好。旧缓存今天重新索引，时间很新，但并不代表它的事实版本更新。',
      '先隔离项目范围，再排除deleted状态与超过TTL的记录。无论相关分数多高，其他项目记录、已撤回偏好和过期事实都不进入候选池。删除还需要传播到派生摘要与缓存，单次过滤不是完整删除保证。',
      '对同一事实键，按已验证版本只保留v2。不能让v1因为重索引时间更近、检索相似度更高而覆盖明确的新版本；版本冲突需要独立规则，不交给软分数随意决定。',
      `本社区演示使用score=relevance×2^(−age/halfLife)。半衰期${halfLife}天时，当前事实得${fmt(currentScore,6)}，近期流程得.7，首位${topId}。较长半衰期降低对两天旧事实的惩罚；分数是检索策略，不是真实性概率，也不能覆盖硬过滤。`
    ];
    return {svg,formula:'先过滤scope/status/TTL → 每key选择已验证最高version → score=relevance·2^(−ageDays/halfLifeDays)',body:bodies[step],result:`current=${fmt(currentScore,6)} · recent=.700000 · top=${topId}`,note:'本例时间评分为社区自定义规则，不冒充MemGPT或Mem0原公式；所有记忆是合成数据，未读写用户真实记忆。',metrics:{halfLife,rawCount:6,eligibleCount:2,supersededCount:1,expiredCount:1,outOfScopeCount:1,deletedCount:1,currentScore,recentScore,topId,currentFactVersion:2}};
  }};
  C['cs329z-07']={name:'记忆生命周期：硬过滤后才使用时间衰减',instructions:['检查时间最新的old为何仍被current替代。','将halfLife从2改为14，观察排序变化而事实版本不变。','把其他项目或deleted条目的相关分数改得更高，确认它们仍不能返回。'],expected:'默认合法候选current/recent，分数.4/.7，首位recent；半衰期14天current约.7246，变为首位。旧版、过期、越界、删除条目始终排除。',code:`const halfLife=2,scope='A';
const records=[
 {id:'old',key:'region',version:1,relevance:.99,age:0,ttl:30,scope:'A',status:'active'},
 {id:'current',key:'region',version:2,relevance:.8,age:2,ttl:30,scope:'A',status:'active'},
 {id:'recent',key:'build',version:1,relevance:.7,age:0,ttl:7,scope:'A',status:'active'},
 {id:'expired',key:'dependency',version:1,relevance:1,age:20,ttl:7,scope:'A',status:'active'},
 {id:'foreign',key:'secret',version:1,relevance:1,age:0,ttl:7,scope:'B',status:'active'},
 {id:'deleted',key:'preference',version:1,relevance:1,age:0,ttl:7,scope:'A',status:'deleted'}];
const outOfScopeCount=records.filter(r=>r.scope!==scope).length;
const deletedCount=records.filter(r=>r.scope===scope&&r.status==='deleted').length;
const expiredCount=records.filter(r=>r.scope===scope&&r.status!=='deleted'&&r.age>r.ttl).length;
const eligible=records.filter(r=>r.scope===scope&&r.status!=='deleted'&&r.age<=r.ttl);
const latest=new Map();for(const r of eligible)if(!latest.has(r.key)||r.version>latest.get(r.key).version)latest.set(r.key,r);
const ranked=[...latest.values()].map(r=>({...r,score:r.relevance*2**(-r.age/halfLife)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
console.log({halfLife,rawCount:records.length,eligibleCount:ranked.length,supersededCount:eligible.length-ranked.length,
 expiredCount,outOfScopeCount,deletedCount,currentScore:ranked.find(r=>r.id==='current').score,recentScore:ranked.find(r=>r.id==='recent').score,
 topId:ranked[0].id,currentFactVersion:latest.get('region').version});`};

  V['cs329z-08']={title:'三方合并：两个角色改同一字段，不能只让最后一个赢',param:'Agent C 提议的 timeout',min:30,max:60,step:15,value:45,steps:['所有角色读取同一基线','只收集相对基线的有效修改','逐字段检测不同修改值','无冲突才提交整份结果'],render(step,candidateC){
    const conflictCount=candidateC!==30&&candidateC!==60?1:0,ready=conflictCount===0;
    const stagedTimeout=ready?60:30,stagedRetries=3,committedTimeout=ready?60:30,committedRetries=ready?3:2,agreeingTimeoutWriters=candidateC===60?2:1;
    let svg=text(26,29,'共同基线：timeout=30，retries=2','v-title');
    svg+=node(28,68,210,'Agent A','timeout → 60',step===1)+node(275,68,210,'Agent B','retries → 3',step===1)+node(522,68,210,'Agent C',`timeout → ${candidateC}`,step===1);
    svg+=arrow(132,140,288,180)+arrow(380,140,380,180)+arrow(627,140,472,180);
    svg+=node(245,188,270,ready?'候选合并无字段冲突':'timeout存在冲突',`staged: ${stagedTimeout} / ${stagedRetries}`,step===2);
    svg+=text(28,301,ready?`提交：timeout=${committedTimeout}，retries=${committedRetries}`:'提交被阻止：保留原 timeout=30、retries=2','v-title');
    const bodies=[
      '三个角色读取相同基线版本。A将timeout改为60，B将retries改为3，C给出另一份timeout提议。输出不是口头投票，而是包含基线与字段变化的可核查补丁。',
      `C提议${candidateC}。若仍为30，它相对基线没有修改，不能被误读为否决A；若为60，两个角色提出相同新值；若为45，就与A的60构成不同变化。`,
      `逐字段汇总相对基线的不同目标值。retries只有3一个变化，无冲突；timeout${ready?'可合并为60':'有60和45两个不同变化，需要协调者核验'}。相同值不产生文本冲突，但仍不能证明语义正确。`,
      `暂存结果与提交结果分开：当前${ready?'全部字段无冲突，原子提交候选':'有冲突，整份提交暂停，连retries=3也未发布'}。这能防止一半修改已经生效、另一半仍在争论的隐含状态。实际代码还需要测试、版本检查与写入所有权。`
    ];
    return {svg,formula:'Δagent={field:value | value≠base[field]}；同字段存在多个不同新值 → 冲突 → 不提交',body:bodies[step],result:`冲突 ${conflictCount} · ready=${ready} · 已提交 ${committedTimeout}/${committedRetries}`,note:'纯内存三方合并模型，不启动实际智能体或修改配置；字段无冲突只是必要检查，不能替代语义验证。',metrics:{candidateC,conflictCount,stagedTimeout,stagedRetries,committedTimeout,committedRetries,ready,agreeingTimeoutWriters}};
  }};
  C['cs329z-08']={name:'协作合并：保留基线，拒绝静默覆盖冲突',instructions:['默认C=45时确认候选retries虽为3，已提交retries仍为2。','把candidateC改为30与60，分别解释无修改和同值修改。','增加新字段与补丁，检查无冲突合并后仍需要哪些验收。'],expected:'C45：timeout冲突，staged30/3，但committed30/2。C30或60：无冲突，committed60/3；C60有两个相同timeout提议。',code:`const base={timeout:30,retries:2},candidateC=45;
const patches=[{owner:'A',timeout:60},{owner:'B',retries:3},{owner:'C',timeout:candidateC}];
const staged={...base},conflicts=[];
for(const field of Object.keys(base)){
 const changes=patches.filter(p=>Object.hasOwn(p,field)&&p[field]!==base[field]);
 const values=[...new Set(changes.map(p=>p[field]))];
 if(values.length>1)conflicts.push({field,changes});else if(values.length===1)staged[field]=values[0];
}
const ready=conflicts.length===0,committed=ready?{...staged}:{...base};
const agreeingTimeoutWriters=patches.filter(p=>p.timeout===60).length;
console.log({candidateC,conflictCount:conflicts.length,stagedTimeout:staged.timeout,stagedRetries:staged.retries,
 committedTimeout:committed.timeout,committedRetries:committed.retries,ready,agreeingTimeoutWriters});`};

  const searchOutcomes={A:[1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0],B:[1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1],C:[0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1],D:[0,0,1,1,1,1,0,1,0,1,0,1,0,1,0,1]};
  function halve(initialTasks){let active=Object.keys(searchOutcomes),previous=0,totalEvaluations=0;const rounds=[];for(const target of [initialTasks,2*initialTasks,4*initialTasks]){totalEvaluations+=active.length*(target-previous);const ranked=active.map(id=>({id,successes:searchOutcomes[id].slice(0,target).reduce((a,b)=>a+b,0)})).sort((a,b)=>b.successes-a.successes||a.id.localeCompare(b.id));rounds.push({target,ranked});active=ranked.slice(0,Math.max(1,Math.floor(active.length/2))).map(r=>r.id);previous=target;}const winner=active[0],winnerSuccesses=rounds[2].ranked[0].successes;return {rounds,initialTasks,maxTasks:initialTasks*4,totalEvaluations,fullEvaluations:16*initialTasks,winner,winnerSuccesses,winnerScore:winnerSuccesses/(4*initialTasks),survivorsRound1:rounds[1].ranked.map(r=>r.id).sort(),survivorsRound2:[winner]};}
  V['cs329z-09']={title:'Successive halving：把评估预算留给暂时有希望的候选',param:'第一轮每候选开发任务数',min:1,max:4,step:1,value:2,steps:['固定候选、开发任务顺序与预算','第一轮四选二','第二轮二选一，复用已有结果','最后追加验证预算，再冻结配置'],render(step,initialTasks){
    const r=halve(initialTasks);let svg=text(26,29,'合成开发集结果；同分按候选ID排序，不使用最终测试集','v-title');
    r.rounds.forEach((round,i)=>{const x=28+i*245;svg+=text(x,75,`轮${i+1}：每项${round.target}题`,'v-title');round.ranked.forEach((row,j)=>{const y=96+j*42;svg+=rect(x,y,210,32,step===i+1?'v-node active':'v-node',4)+text(x+15,y+22,`${row.id}  ${row.successes}/${round.target}`,'v-small');});if(i<2)svg+=arrow(x+215,158,x+239,158);});
    svg+=text(28,302,`选择 ${r.winner} · 增量评估 ${r.totalEvaluations} 次；全候选满预算 ${r.fullEvaluations} 次`,'v-title');
    const bodies=[
      '先固定4个候选A/B/C/D、开发任务顺序、三个预算层级n/2n/4n和相同分数的ID排序规则。一次“评估”指一个候选在一道合成开发任务上的结果，本页没有真实模型调用。',
      `第一轮每项${initialTasks}题，保留前2项。小样本分数波动可能很大，早期被淘汰的候选可能在更多任务上更强；节省预算并不等于找到全局最优。`,
      `第二轮只把幸存者追加到${2*initialTasks}题，已有结果复用，不重复付费。保留${r.winner}进入最后一轮；候选的比较使用同一开发任务前缀，不能让不同候选恰好遇到完全不同难度。`,
      `最后将胜出候选追加到${r.maxTasks}题，得${r.winnerSuccesses}/${r.maxTasks}。总计4n+2n+2n=8n=${r.totalEvaluations}次，而全部4候选均评4n题需要16n=${r.fullEvaluations}次。此分数参与了选择，仍是开发结果；冻结后还需独立测试，不能把它写成泛化成绩。`
    ];
    const {rounds,...metrics}=r;return {svg,formula:'预算层级 n→2n→4n；候选数4→2→1；复用前缀时增量成本=4n+2n+2n=8n',body:bodies[step],result:`winner=${r.winner} · dev=${fmt(r.winnerScore,3)} · ${r.totalEvaluations}/${r.fullEvaluations}次预算`,note:'候选结果完全合成，successive halving是社区预算例，不冒充GEPA/MIPRO论文成绩；早期淘汰有风险。',metrics};
  }};
  C['cs329z-09']={name:'提示搜索预算：逐轮淘汰与增量记账',instructions:['先手算n=2时第一轮A/B留下、第二轮B领先。','将initialTasks改为1与4，观察胜者改变。','区分选择过程消耗的开发任务与最后才使用的独立测试集。'],expected:'n=2：选B，最后6/8，增量16次而全量32次。n=1选A，最后2/4；n=4选C，最后14/16。',code:`const outcomes={A:[1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0],B:[1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1],C:[0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1],D:[0,0,1,1,1,1,0,1,0,1,0,1,0,1,0,1]};
const initialTasks=2;let active=Object.keys(outcomes),previous=0,totalEvaluations=0;const survivors=[];
for(const target of [initialTasks,2*initialTasks,4*initialTasks]){
 totalEvaluations+=active.length*(target-previous);
 const ranked=active.map(id=>({id,successes:outcomes[id].slice(0,target).reduce((s,v)=>s+v,0)})).sort((a,b)=>b.successes-a.successes||a.id.localeCompare(b.id));
 console.log({target,ranked});
 active=ranked.slice(0,Math.max(1,Math.floor(active.length/2))).map(r=>r.id);survivors.push([...active]);previous=target;
}
const winner=active[0],maxTasks=4*initialTasks,winnerSuccesses=outcomes[winner].slice(0,maxTasks).reduce((a,b)=>a+b,0);
console.log({initialTasks,maxTasks,totalEvaluations,fullEvaluations:4*maxTasks,winner,winnerSuccesses,winnerScore:winnerSuccesses/maxTasks,
 survivorsRound1:survivors[0],survivorsRound2:survivors[1]});`};

  function verify(artifactCase){const outputs=[null,'',JSON.stringify({rows:[{id:'a',amount:2},{id:'b',amount:30}],total:32}),JSON.stringify({rows:[{id:'a',amount:2},{id:'b',amount:3}],total:5})];const fileExists=outputs[artifactCase]!==null;let parsed=null,parseable=false;try{if(fileExists){parsed=JSON.parse(outputs[artifactCase]);parseable=true;}}catch{}const schemaValid=!!(parsed&&Array.isArray(parsed.rows)&&Number.isFinite(parsed.total)&&parsed.rows.every(r=>r&&typeof r.id==='string'&&Number.isFinite(r.amount)));const uniqueIds=schemaValid&&new Set(parsed.rows.map(r=>r.id)).size===parsed.rows.length;const semanticMatch=!!(uniqueIds&&parsed.rows.length===2&&parsed.total===5&&parsed.rows.some(r=>r.id==='a'&&r.amount===2)&&parsed.rows.some(r=>r.id==='b'&&r.amount===3));const checks=[true,fileExists,parseable,schemaValid,uniqueIds,semanticMatch];return {artifactCase,exitOK:true,fileExists,parseable,schemaValid,uniqueIds,semanticMatch,passedChecks:checks.filter(Boolean).length,checkCount:6,success:checks.every(Boolean)};}
  V['cs329z-10']={title:'退出码0之后：最终产物真的满足任务契约吗？',param:'产物：0缺失 / 1空 / 2内容错 / 3正确',min:0,max:3,step:1,value:2,steps:['固定输入与正确转换规则','模拟进程退出与虚拟产物','独立验证器逐项检查','只有全部断言成立才通过'],render(step,artifactCase){
    const m=verify(artifactCase),keys=['exitOK','fileExists','parseable','schemaValid','uniqueIds','semanticMatch'],labels=['进程退出码0','report.json存在','JSON可解析','字段与数值类型','id没有重复','转换结果语义正确'];
    let svg=text(26,29,'原始[a:2,b:3,b:3] → 去重/数值化 → [a:2,b:3]，总和5','v-title');
    keys.forEach((key,i)=>{const x=30+(i%2)*370,y=71+Math.floor(i/2)*69;svg+=rect(x,y,332,48,m[key]?'v-node active':'v-node')+text(x+17,y+29,labels[i],'v-small')+text(x+300,y+29,m[key]?'✓':'×','v-center');});
    svg+=text(28,303,`通过 ${m.passedChecks}/6 · 最终 ${m.success?'通过':'失败'}（所有场景退出码都为0）`,'v-title');
    const bodies=[
      '任务要求按id去重，将金额转换成数值，保留a=2、b=3，并输出总和5。输入与验收规则是预先固定的，不由待评系统自己决定。这里的report.json只是内存字符串，没有真实文件或终端执行。',
      '四种模拟产物分别是缺失、空字符串、结构合法但b=30且total=32、完全正确。每种场景都声称进程退出0，这只说明进程报告正常结束，不证明目标完成。',
      `验证器独立检查6项。当前通过${m.passedChecks}项；内容错误产物可通过存在、JSON、schema、唯一性等形式检查，却仍不满足原始转换语义。空产物也不能仅凭存在就通过。`,
      `最终success=${m.success}，使用全部断言的逻辑与。真实Terminal-Bench还包括隔离环境、版本、预算、试验次数和基础设施分类；本页只模拟任务验收机制，不能当作真实基准运行或分数。`
    ];
    return {svg,formula:'success = exitOK ∧ exists ∧ parseable ∧ schema ∧ uniqueIDs ∧ semanticMatch',body:bodies[step],result:`case=${artifactCase} · checks=${m.passedChecks}/6 · success=${m.success}`,note:'纯内存虚拟产物，未调用shell、写文件、运行容器或执行Terminal-Bench；通过数仅用于检查评分器反例。',metrics:m};
  }};
  C['cs329z-10']={name:'任务验收：合法JSON也可能装着错误结果',instructions:['默认artifactCase=2，确认前五项通过但语义断言失败。','切换0、1、3，检查缺失、空产物与正确产物。','再构造重复ID或金额字符串反例，检验评分器是否拒绝。'],expected:'case0/1/2/3分别通过1/2/5/6项；只有case3整体成功。所有虚拟进程退出码均0。',code:`const artifactCase=2,exitCode=0;
const artifacts=[null,'',JSON.stringify({rows:[{id:'a',amount:2},{id:'b',amount:30}],total:32}),JSON.stringify({rows:[{id:'a',amount:2},{id:'b',amount:3}],total:5})];
const fileExists=artifacts[artifactCase]!==null;let result=null,parseable=false;
try{if(fileExists){result=JSON.parse(artifacts[artifactCase]);parseable=true;}}catch{}
const schemaValid=!!(result&&Array.isArray(result.rows)&&Number.isFinite(result.total)&&result.rows.every(r=>r&&typeof r.id==='string'&&Number.isFinite(r.amount)));
const uniqueIds=schemaValid&&new Set(result.rows.map(r=>r.id)).size===result.rows.length;
const semanticMatch=!!(uniqueIds&&result.rows.length===2&&result.total===5&&result.rows.some(r=>r.id==='a'&&r.amount===2)&&result.rows.some(r=>r.id==='b'&&r.amount===3));
const exitOK=exitCode===0,checks=[exitOK,fileExists,parseable,schemaValid,uniqueIds,semanticMatch];
console.log({artifactCase,exitOK,fileExists,parseable,schemaValid,uniqueIds,semanticMatch,passedChecks:checks.filter(Boolean).length,checkCount:checks.length,success:checks.every(Boolean)});`};

  V['cs329z-11']={title:'轨迹很多，不等于任务很多：重复易题会改变平均数',param:'易任务A保留的成功轨迹数',min:1,max:8,step:1,value:4,steps:['把每条轨迹绑定原始任务ID','计算不加区分的轨迹平均','改为每个任务等权','检查复制轨迹是否制造虚假进步'],render(step,easyCopies){
    const trajectoryCount=easyCopies+2,naiveSuccessRate=easyCopies/trajectoryCount,taskBalancedSuccessRate=1/3,easyTrajectoryWeight=1/(3*easyCopies),easyTaskMass=1/3,hardTaskMass=2/3,uniqueTasks=3;
    let svg=text(26,29,'任务A总成功，任务B/C各一条失败；目标是三个任务等权','v-title');
    svg+=node(28,65,210,'任务 A',`${easyCopies}条成功轨迹`,step===0)+node(275,65,210,'任务 B','1条失败轨迹',step===0)+node(522,65,210,'任务 C','1条失败轨迹',step===0);
    svg+=text(30,175,'直接按轨迹平均','v-small')+box(30,191,650*naiveSuccessRate,25,colors[0])+text(30,241,'每个任务等权平均','v-small')+box(30,257,650/3,25,colors[1]);
    svg+=text(710,211,`${fmt(naiveSuccessRate*100,1)}%`,'v-end')+text(710,277,'33.3%','v-end');
    const bodies=[
      '每条运行保存canonical task ID，不能因重试、不同措辞或不同种子就自动当作新任务。本例A、B、C三个任务各有固定结果，只改变A成功轨迹的保留份数，没有改变系统能力。',
      `共有${trajectoryCount}条轨迹，其中${easyCopies}条成功，朴素平均${fmt(naiveSuccessRate,6)}。采集更多易题轨迹即可提高这个数字，因此必须说明它估计的是按当前采集频率加权的表现。`,
      `若目标是三个任务等权，每个任务先平均，再对任务平均。A的每条轨迹权重1/(3×${easyCopies})=${fmt(easyTrajectoryWeight,6)}，A总权重仍1/3；B与C各1/3。任务均匀成功率恒为1/3。`,
      '复制A轨迹只改变轨迹均值，不改变任务均值。训练或评估前应保留来源ID，并将同一任务族的轨迹放在同一数据划分；任务均匀权重是本例目标，并非任何部署人群都应采用的万能权重。相关轨迹也不能因为加权就视为独立样本。'
    ];
    return {svg,formula:'轨迹平均=Σ成功/轨迹数；任务均匀=(1/G)Σg[(1/n_g)Σᵢ成功_gi]；每轨迹权重=1/(G n_g)',body:bodies[step],result:`轨迹平均 ${fmt(naiveSuccessRate,6)} · 任务均匀 ${fmt(taskBalancedSuccessRate,6)} · 独立任务ID 3`,note:'合成数据只演示采集频率偏差，不训练模型；任务成功也不能自动充当每一步动作正确的标签。',metrics:{easyCopies,trajectoryCount,naiveSuccessRate,taskBalancedSuccessRate,easyTrajectoryWeight,easyTaskMass,hardTaskMass,uniqueTasks}};
  }};
  C['cs329z-11']={name:'轨迹权重：复制成功记录不会增加独立任务数',instructions:['增加easyCopies，比较两种成功率。','核对每个任务的总权重都是1/3，而不是每条轨迹都一样。','给真实轨迹保留task ID与步骤证据，说明为什么最终成功不代表每一步都正确。'],expected:'4份A成功+各1份B/C失败：轨迹均值4/6=2/3；任务均匀均值1/3。每份A权重1/12，A总质量1/3。',code:`const easyCopies=4;
const trajectories=[...Array.from({length:easyCopies},(_,i)=>({task:'A',run:i,success:1})),{task:'B',run:0,success:0},{task:'C',run:0,success:0}];
const groups=new Map();for(const row of trajectories){if(!groups.has(row.task))groups.set(row.task,[]);groups.get(row.task).push(row);}
const uniqueTasks=groups.size,trajectoryCount=trajectories.length;
const naiveSuccessRate=trajectories.reduce((sum,r)=>sum+r.success,0)/trajectoryCount;
const weighted=trajectories.map(r=>({...r,weight:1/(uniqueTasks*groups.get(r.task).length)}));
const taskBalancedSuccessRate=weighted.reduce((sum,r)=>sum+r.success*r.weight,0);
const easyTaskMass=weighted.filter(r=>r.task==='A').reduce((sum,r)=>sum+r.weight,0);
console.log({easyCopies,trajectoryCount,naiveSuccessRate,taskBalancedSuccessRate,easyTrajectoryWeight:1/(uniqueTasks*easyCopies),easyTaskMass,hardTaskMass:1-easyTaskMass,uniqueTasks});`};

  const selectionTasks=[{id:'A',cost:2,covers:['R','T','E','L']},{id:'B',cost:2,covers:['R','T','M']},{id:'C',cost:2,covers:['E','L','S']}];
  function selectCoverage(budget){let cost=0,covered=new Set(),selected=[];while(true){const candidates=selectionTasks.filter(t=>!selected.includes(t.id)&&t.cost+cost<=budget).map(t=>({...t,gain:t.covers.filter(c=>!covered.has(c)).length})).sort((a,b)=>b.gain/b.cost-a.gain/a.cost||a.id.localeCompare(b.id));const best=candidates[0];if(!best||best.gain===0)break;selected.push(best.id);cost+=best.cost;best.covers.forEach(c=>covered.add(c));}let optimalSelected=[],optimalCost=0,optimalCoverage=0;for(let mask=0;mask<8;mask++){const tasks=selectionTasks.filter((_,i)=>mask&(1<<i)),sum=tasks.reduce((s,t)=>s+t.cost,0),count=new Set(tasks.flatMap(t=>t.covers)).size;if(sum<=budget&&(count>optimalCoverage||(count===optimalCoverage&&sum<optimalCost))){optimalSelected=tasks.map(t=>t.id);optimalCost=sum;optimalCoverage=count;}}return {budget,selected,coverage:covered.size,cost,optimalSelected,optimalCoverage,optimalCost,gap:optimalCoverage-covered.size,totalDimensions:6};}
  V['cs329z-12']={title:'代表样本选择：新增覆盖要扣除已有覆盖',param:'可用标注预算（每条成本2）',min:0,max:6,step:2,value:4,steps:['写出六个需要覆盖的行为维度','先比较新增覆盖/成本','选择后重新计算边际收益','用小规模穷举检查贪心的局限'],render(step,budget){
    const m=selectCoverage(budget),dimensions=['R','T','E','L','M','S'];let svg=text(26,29,'R检索 T工具 E恢复 L长文 M跨语 S拒答；每样例成本2','v-title');
    dimensions.forEach((d,j)=>svg+=text(240+j*76,77,d,'v-center v-small'));
    selectionTasks.forEach((task,i)=>{const y=105+i*52;svg+=text(28,y+20,`样例${task.id}  ${m.selected.includes(task.id)?'已选':'未选'}`,'v-small');dimensions.forEach((d,j)=>{svg+=rect(212+j*76,y,56,33,task.covers.includes(d)?'v-node active':'v-node',3);if(task.covers.includes(d))svg+=text(240+j*76,y+23,'●','v-center');});});
    svg+=text(28,280,`贪心 [${m.selected.join(',')}]：覆盖${m.coverage}/6，成本${m.cost}`);
    svg+=text(28,313,`穷举最佳 [${m.optimalSelected.join(',')}]：覆盖${m.optimalCoverage}/6，成本${m.optimalCost}`,'v-title');
    const bodies=[
      '先定义六个二元覆盖维度。A覆盖R/T/E/L，B覆盖R/T/M，C覆盖E/L/S，各花2单位预算。这里假设样例都已核验有效；覆盖矩阵不能代替标签正确性与任务可复现性检查。',
      '初始A新增4维、收益/成本=2，B和C各新增3维、比值1.5。因此贪心先选A。同分时按样例ID排序，让选择过程可以复现。',
      `A入选后，B只能新增M，C只能新增S；不能继续把它们都算成新增3维。预算${budget}时，贪心选择[${m.selected.join(',')}]，覆盖${m.coverage}维。预算为0时应返回空集合，不能偷偷超支。`,
      `对3个候选可以穷举8种子集，最佳[${m.optimalSelected.join(',')}]覆盖${m.optimalCoverage}维、成本${m.optimalCost}。默认预算4时，B+C覆盖全部6维，而贪心A+B只覆盖5维；可见贪心是启发式而非最优保证。覆盖相同时本例优先较低成本。`
    ];
    return {svg,formula:'边际收益=|covers(candidate)\u2216covered|；贪心评分=边际收益/cost；总cost≤budget',body:bodies[step],result:`贪心覆盖 ${m.coverage}/6 · 最优 ${m.optimalCoverage}/6 · 差 ${m.gap}`,note:'小型合成集合覆盖/预算模型，穷举仅用于3候选。覆盖率不是自然分布成功率，也不保证所有组合交互已覆盖。',metrics:m};
  }};
  C['cs329z-12']={name:'预算覆盖：贪心选择与八个子集的精确对照',instructions:['默认预算4，计算选A后B/C的新增覆盖。','比较贪心A+B与精确最佳B+C，解释为什么局部最好未必全局最好。','将budget改为0、2、6，检查不超预算和同覆盖优先低成本。'],expected:'预算4：贪心[A,B]覆盖5、成本4；最优[B,C]覆盖6、成本4。预算6贪心全选成本6，但[B,C]已用成本4覆盖全部。',code:`const budget=4,dimensions=['R','T','E','L','M','S'];
const tasks=[{id:'A',cost:2,covers:['R','T','E','L']},{id:'B',cost:2,covers:['R','T','M']},{id:'C',cost:2,covers:['E','L','S']}];
const covered=new Set(),selected=[];let cost=0;
while(true){
 const options=tasks.filter(t=>!selected.includes(t.id)&&cost+t.cost<=budget).map(t=>({...t,gain:t.covers.filter(x=>!covered.has(x)).length})).sort((a,b)=>b.gain/b.cost-a.gain/a.cost||a.id.localeCompare(b.id));
 const best=options[0];if(!best||best.gain===0)break;
 selected.push(best.id);cost+=best.cost;best.covers.forEach(x=>covered.add(x));
}
let optimalSelected=[],optimalCoverage=0,optimalCost=0;
for(let mask=0;mask<2**tasks.length;mask++){
 const subset=tasks.filter((_,i)=>mask&(1<<i)),c=subset.reduce((s,t)=>s+t.cost,0),n=new Set(subset.flatMap(t=>t.covers)).size;
 if(c<=budget&&(n>optimalCoverage||(n===optimalCoverage&&c<optimalCost))){optimalSelected=subset.map(t=>t.id);optimalCoverage=n;optimalCost=c;}
}
console.log({budget,selected,coverage:covered.size,cost,optimalSelected,optimalCoverage,optimalCost,gap:optimalCoverage-covered.size,totalDimensions:dimensions.length});`};
})();
