/* CS229 09–15: each lesson has its own data, mechanism and executable experiment. */
(() => {
  'use strict';
  const H=window.MLVis, V=window.COURSE_VISUALS ||= {}, C=window.COURSE_CODE ||= {};
  const {text,line,arrow,rect,node,point,fmt}=H;
  const f=n=>fmt(n,3), sum=a=>a.reduce((x,y)=>x+y,0);
  const curve=(values,px,py,stroke='#65b6f3')=>`<polyline points="${values.map(([x,y])=>`${px(x)},${py(y)}`).join(' ')}" fill="none" stroke="${stroke}" stroke-width="2.4"/>`;
  const badge=(x,y,label,color='#65b6f3')=>`<circle cx="${x}" cy="${y}" r="12" fill="${color}"/>${text(x,y+4,label,'v-center v-small').replace('<text ', '<text style="fill:#0d1420;font-weight:700" ')}`;
  const gini=labels=>{if(!labels.length)return 0;const p=labels.filter(x=>x===1).length/labels.length;return 2*p*(1-p);};

  V['cs229-09']={title:'一刀切下去，节点究竟纯了多少？',param:'切分位置：左侧样本数',min:1,max:5,step:1,value:3,steps:['观察父节点','按阈值分到两侧','计算加权不纯度','比较候选切分'],render(step,k){
    k=Math.round(k);const labels=[1,1,-1,1,-1,-1],left=labels.slice(0,k),right=labels.slice(k),parent=gini(labels),gl=gini(left),gr=gini(right),weighted=k/6*gl+(6-k)/6*gr,gain=parent-weighted;
    const gains=[1,2,3,4,5].map(j=>parent-j/6*gini(labels.slice(0,j))-(6-j)/6*gini(labels.slice(j)));const best=gains.indexOf(Math.max(...gains))+1;
    let svg=text(28,29,'同一维特征：按 x 从小到大排列的 6 个样本','v-title');
    labels.forEach((y,i)=>{svg+=badge(70+i*52,77,y===1?'+':'−',y===1?'#58b8dc':'#e4ad65');svg+=text(70+i*52,107,`x=${i+1}`,'v-small v-center');});
    svg+=line(44+k*52,50,44+k*52,121,'v-yellow')+text(404,75,`父节点 Gini = ${f(parent)}`,'v-small');
    if(step>=1){svg+=arrow(170,130,140,164)+arrow(260,130,370,164);svg+=node(35,168,210,`左：${left.filter(y=>y===1).length} 正 / ${left.filter(y=>y===-1).length} 负`,`Gini = ${f(gl)}`,true)+node(285,168,210,`右：${right.filter(y=>y===1).length} 正 / ${right.filter(y=>y===-1).length} 负`,`Gini = ${f(gr)}`,true);}
    if(step>=2)svg+=text(45,274,`加权 Gini = ${k}/6 × ${f(gl)} + ${6-k}/6 × ${f(gr)} = ${f(weighted)}`,'v-small')+text(45,303,`下降量 Δ = ${f(parent)} − ${f(weighted)} = ${f(gain)}`,'v-title');
    if(step===3){gains.forEach((g,i)=>{const y=145+i*29;svg+=text(535,y+12,`k=${i+1}`,'v-small')+`<rect x="575" y="${y}" width="${g*330}" height="16" rx="2" fill="${i+1===k?'#e5bf6b':'#5ea5d7'}"/>`+text(700,y+12,f(g),'v-small');});}
    const bodies=[`父节点有 3 个正例、3 个负例。随机抽取两个标签会出现混合，因此 Gini = 1−(3/6)²−(3/6)² = 0.5。蓝色是正例，橙色是负例；横轴顺序属于输入特征，不是类别。`,`把切分线放在第 ${k} 个样本之后。左、右节点分别包含 ${k} 和 ${6-k} 个样本。只看某一侧是否纯会误导，因为很小的纯节点不一定能降低整组样本的不纯度。`,`用节点样本比例作为权重：加权不纯度为 ${f(weighted)}，相对于父节点下降 ${f(gain)}。默认 k=3 时，两个子节点都具有 Gini=4/9，下降量只有 1/18。`,`右侧比较全部 5 个阈值；本例最优位置是 k=${best}（若并列取最左）。这只保证当前节点的贪心选择最好，并不保证整棵树全局最优。Bagging 与 boosting 还需要在树外引入额外的组合策略。`];
    return{svg,metrics:{parentGini:parent,weightedGini:weighted,gain,bestSplit:best},formula:'Gini(S)=1−Σₖpₖ²；Δ=Gini(parent)−Σchild |child|/|parent|·Gini(child)',body:bodies[step],result:`切分 k=${k} · 加权 Gini ${f(weighted)} · 下降 ${f(gain)}`,note:'标签固定；拖动的参数是切分位置。本实验只展示树节点的分类准则，不把它冒充集成算法。'};
  }};
  C['cs229-09']={name:'树的 Gini 切分：逐个阈值算清楚',instructions:['先预测 k=3 时不纯度会下降多少，再运行代码。','把 split 改为 1、2、4、5，找出最佳阈值。','说明为什么不能只选择“左节点最纯”的切分。'],expected:'默认父 Gini=0.5，加权 Gini=4/9≈0.444444，下降1/18≈0.055556；最佳阈值k=2与4并列。',code:`const labels = [1, 1, -1, 1, -1, -1];
const split = 3; // 左节点含多少个样本，试试 1..5
const gini = ys => {
  const p = ys.filter(y => y === 1).length / ys.length;
  return 2 * p * (1-p);
};
const parent = gini(labels);
const candidates = Array.from({length: labels.length-1}, (_,i) => {
  const k=i+1, left=labels.slice(0,k), right=labels.slice(k);
  const weighted = (left.length*gini(left)+right.length*gini(right))/labels.length;
  return {split:k, weightedGini:weighted, gain:parent-weighted};
});
console.log({parentGini:parent, selected:candidates[split-1]});
console.log('全部候选', candidates);
const best = Math.max(...candidates.map(x=>x.gain));
console.log('并列最优阈值', candidates.filter(x=>Math.abs(x.gain-best)<1e-12).map(x=>x.split));`};

  V['cs229-10']={title:'正则化怎样把最优点从 2 拉向 0',param:'L2 强度 λ',min:0,max:5,step:.25,value:1,steps:['只拟合观测','加入参数惩罚','寻找总目标的最小值','比较偏移与验证选择'],render(step,lambda){
    const w=2/(1+lambda),data=.5*(w-2)**2,penalty=lambda*w*w/2,total=data+penalty,px=x=>62+x*151,py=y=>264-y*33;
    let svg=text(28,29,'单样本 x=1，y=2：同一参数面对两个拉力','v-title')+line(55,264,455,264,'v-axis')+line(62,264,62,55,'v-axis')+text(450,287,'w','v-small')+text(35,58,'J','v-small');
    const xs=Array.from({length:61},(_,i)=>i/24);
    svg+=curve(xs.map(x=>[x,.5*(x-2)**2]),px,py,'#65b6f3')+text(500,86,'蓝：数据项 ½(w−2)²','v-small');
    if(step>=1)svg+=curve(xs.map(x=>[x,Math.min(6.1,lambda*x*x/2)]),px,py,'#8bd3a6')+text(500,119,'绿：惩罚项 λw²/2','v-small');
    if(step>=2){svg+=curve(xs.map(x=>[x,Math.min(6.1,.5*(x-2)**2+lambda*x*x/2)]),px,py,'#e5bf6b')+point(px(w),py(total),6,'v-dot')+line(px(w),py(total),px(w),264,'v-yellow')+text(500,152,'黄：两项之和','v-small');}
    for(const x of [0,1,2])svg+=text(px(x),284,x,'v-small v-center');
    svg+=text(500,203,`最优 w* = ${f(w)}`,'v-title')+text(500,237,`数据误差 = ${f(data)}`,'v-small')+text(500,266,`惩罚 = ${f(penalty)}`,'v-small')+text(62,314,'曲线超过纵轴范围的部分已截平；最小值未截断。','v-small');
    const bodies=[`只看观测 x=1、y=2，预测为 w。平方损失在 w=2 时为零，所以无约束最优点是 2。这里没有截距，避免把截距是否受惩罚的问题混进这个一维例子。`,`L2 惩罚偏爱接近零的权重。它不是额外的数据，而是我们对解的偏好。λ=${f(lambda)} 时，绿色曲线与蓝色数据误差一起决定最终位置。`,`总目标导数为 (w−2)+λw。令它等于零，得到 w*=2/(1+λ)=${f(w)}。默认 λ=1 时，权重从 2 收缩到 1；数据误差0.5和惩罚0.5相加为1。`,`越强的收缩会让本例对训练样本的拟合偏差越大。但这张单样本图不能直接测量“泛化方差”。实际选λ需要独立验证或嵌套交叉验证，不能把训练目标最低当作测试表现最好。`];
    return{svg,metrics:{weight:w,dataLoss:data,penalty,total},formula:'J(w)=½(w−2)² + λw²/2；∂J/∂w=(1+λ)w−2；w*=2/(1+λ)',body:bodies[step],result:`λ=${f(lambda)} · 最优 w=${f(w)} · 总目标 ${f(total)}`,note:'这是 ridge 收缩的单参数几何，不是完整的偏差—方差统计实验。绿色/黄色高值被截平以保持坐标可读。'};
  }};
  C['cs229-10']={name:'Ridge：把训练误差与正则项分开记录',instructions:['先计算 λ=1 的最优 w、数据误差与惩罚。','把 lambda 改成0或4，观察训练误差怎样变化。','解释为什么不能仅凭这里的训练结果挑选泛化最好的 λ。'],expected:'λ=1 时 w=1，数据误差0.5，惩罚0.5，总目标1，目标梯度0。λ=0时 w=2；λ=4时 w=0.4。',code:`const lambda = 1;
const x = 1, y = 2;
// J(w)=1/2*(x*w-y)^2 + lambda/2*w^2
const w = x*y/(x*x+lambda);
const dataLoss = 0.5*(x*w-y)**2;
const penalty = 0.5*lambda*w*w;
const gradient = x*(x*w-y)+lambda*w;
console.log({lambda, w, dataLoss, penalty, total:dataLoss+penalty, gradient});
console.log('注意：该例没有验证集，不能从训练目标推断泛化性能。');`};

  V['cs229-11']={title:'从一个模型的界，到一百个模型的共同保证',param:'独立样本数 m',min:100,max:1000,step:5,value:415,steps:['固定一个假设','同时控制整个假设类','求解需要的样本数','检查保证的含义'],render(step,m){
    m=Math.round(m);const size=100,epsilon=.1,delta=.05,single=2*Math.exp(-2*m*epsilon**2),raw=size*single,bound=Math.min(1,raw),need=Math.ceil(Math.log(2*size/delta)/(2*epsilon**2));
    const px=x=>65+(x-100)*.44,py=y=>65-Math.log10(Math.max(y,1e-7))*29;
    let svg=text(28,29,'固定 |H|=100，ε=0.1，δ=0.05','v-title')+line(65,270,465,270,'v-axis')+line(65,270,65,55,'v-axis');
    const vals=Array.from({length:91},(_,i)=>{const n=100+i*10;return[n,Math.min(1,(step===0?2:200)*Math.exp(-.02*n))];});
    svg+=curve(vals,px,py)+line(65,py(delta),465,py(delta),'v-yellow')+text(471,py(delta)+5,'δ=.05','v-small')+point(px(m),py(step===0?single:bound),6,'v-dot');
    for(const n of [100,400,700,1000])svg+=text(px(n),293,n,'v-small v-center');
    for(const [y,label] of [[1,'1'],[.01,'10⁻²'],[.0001,'10⁻⁴'],[.000001,'10⁻⁶']])svg+=text(12,py(y)+4,label,'v-small');
    svg+=text(65,316,'纵轴为对数：越低表示越小的失败概率上界。','v-small')+text(520,85,`m = ${m}`,'v-title')+text(520,123,`单模型界 ${single.toExponential(2)}`,'v-small')+text(520,161,`全体界 ${bound.toExponential(2)}`,'v-small')+text(520,209,`足够样本数：${need}`,'v-title')+text(520,248,m>=need?'已满足这个充分条件':'尚未满足这个充分条件','v-small');
    const bodies=[`对一个预先固定的模型，0–1损失在[0,1]，独立同分布样本可给出双侧Hoeffding界：失败概率≤2e^(−2mε²)。m=${m}时，上界是${single.toExponential(3)}。`,`学习算法会从100个候选模型中挑选，因此要同时控制全部候选。Union bound把失败概率上界乘以100；这是上界，不是假设100个失败事件相互独立。概率最多为1，所以图中把更大的界截到1。`,`要求2|H|e^(−2mε²)≤δ，取对数并移项：m≥ln(2|H|/δ)/(2ε²)。代入100、0.05、0.1得到414.702…，样本数取上整为415。`,`达到415表示在这些假设下，所有候选模型的经验风险与真实风险偏差超过0.1的概率上界不大于0.05；它不是“准确率至少95%”，也不是保证真实风险≤0.1。重复样本或分布漂移会破坏前提。`];
    return{svg,metrics:{samples:m,singleBound:single,unionBound:bound,required:need},formula:'P(∃h∈H: |R̂(h)−R(h)|>ε) ≤ min(1,2|H|exp(−2mε²))',body:bodies[step],result:`m=${m} · 联合失败上界 ${bound.toExponential(3)} · 所需 m≥${need}`,note:'有限假设集合、固定集合、iid样本及[0,1]损失是前提；图线是理论上界，不是观测误差曲线。'};
  }};
  C['cs229-11']={name:'Hoeffding 与 union bound：计算样本需求',instructions:['先手算为何要求上整到415，而不是414。','增大候选数 H 或减半 epsilon，比较样本需求。','分别解释 epsilon 与 delta，避免把它们当准确率。'],expected:'H=100、epsilon=0.1、delta=0.05时 required=415；m=414的界约0.050707>0.05，m=415约0.049703<0.05。',code:`const H = 100, epsilon = 0.1, delta = 0.05;
const required = Math.ceil(Math.log(2*H/delta)/(2*epsilon**2));
const failureBound = m => Math.min(1,2*H*Math.exp(-2*m*epsilon**2));
console.log({H, epsilon, delta, required});
console.log({m:required-1, failureBound:failureBound(required-1)});
console.log({m:required, failureBound:failureBound(required)});
if (!(failureBound(required)<=delta && failureBound(required-1)>delta)) throw Error('上整边界检查失败');
console.log('这是泛化间隙的充分条件，不是准确率保证。');`};

  V['cs229-12']={title:'感知机：只有违反分类约束时才移动边界',param:'第一样本的 x₁',min:1,max:4,step:.25,value:2,steps:['从零权重开始','读入正例并更新','先预测第二个样本','仅在违反约束时更新','检查两点的有符号间隔'],render(step,v){
    const first=[v,1],second=[-1,2],w1=first,score2=-v+2,update=score2>=0,w2=update?[v+1,-1]:[v,1],w=step===0?[0,0]:step<3?w1:w2;
    const px=x=>245+x*43,py=y=>187-y*43;
    let svg=text(28,29,'标签：蓝点 +1，橙点 −1；截距固定为 0','v-title')+line(48,187,445,187,'v-axis')+line(245,48,245,310,'v-axis');
    svg+=badge(px(first[0]),py(first[1]),'+','#58b8dc')+text(px(first[0]),py(first[1])-22,`(${f(v)},1)`,'v-small v-center')+badge(px(second[0]),py(second[1]),'−','#e4ad65')+text(px(second[0]),py(second[1])-22,'(−1,2)','v-small v-center');
    if(w[0]||w[1]){const scale=3.2/Math.hypot(...w),dx=-w[1]*scale,dy=w[0]*scale;svg+=line(px(-dx),py(-dy),px(dx),py(dy),'v-contour')+arrow(px(0),py(0),px(w[0]*.55),py(w[1]*.55),'v-yellow');}
    svg+=text(490,77,`w = (${f(w[0])}, ${f(w[1])})`,'v-title')+text(490,115,`第二点更新前分数：${f(score2)}`,'v-small')+text(490,150,update?'第二点需更新（y·score ≤ 0）':'第二点分类正确，不更新','v-small');
    if(step>=3)svg+=text(490,205,`正例 y·wᵀx = ${f(w2[0]*v+w2[1])}`,'v-small')+text(490,240,`负例 y·wᵀx = ${f(w2[0]-2*w2[1])}`,'v-small');
    svg+=text(60,319,'灰线：wᵀx=0；黄色箭头：权重方向（缩短显示）。','v-small');
    const bodies=[`从w=(0,0)开始时，所有样本的打分都为0。感知机把y·wᵀx≤0视为违反约束；这包含恰好落在边界上的样本，不依赖把sign(0)随意定义成哪一类。`,`第一个样本x=(${f(v)},1)，y=+1。因为初始间隔为0，执行w←w+yx，得到w=(${f(v)},1)。黄色向量朝正例方向移动，分类边界始终与w垂直。`,`第二个样本是x=(−1,2)、y=−1。先用旧权重预测，打分为2−${f(v)}=${f(score2)}，有符号间隔为${f(-score2)}。先预测、后见标签与更新，是在线评估的重要顺序。`,update?`第二点有符号间隔不为正，因此加上yx=(1,−2)，得到w=(${f(w2[0])},${f(w2[1])})。默认v=2时，结果是(3,−1)。`:`第二点已有正的有符号间隔，感知机跳过更新，仍为w=(${f(w2[0])},${f(w2[1])})。改变输入可以触发不同的分支。`,`现在分别检查两个样本，而不是只看刚更新的点。默认结果的有符号间隔是5与5。这个小例子可分；带噪声或不可分的流不会自动得到有限次错误保证。`];
    return{svg,metrics:{secondScore:score2,updatedSecond:update?1:0,weights:w2,positiveMargin:w2[0]*v+w2[1],negativeMargin:w2[0]-2*w2[1]},formula:'若 y(wᵀx)≤0：w←w+yx；否则保持 w 不变',body:bodies[step],result:`第二点${update?'更新':'跳过'} · 最终 w=(${f(w2[0])},${f(w2[1])})`,note:'两点、二维、无截距的确定性在线例子；权重箭头缩短0.55倍，只用于方向显示，文本为真实数值。'};
  }};
  C['cs229-12']={name:'感知机：记录“先预测、后更新”的完整轨迹',instructions:['在运行前预测两个样本是否都会更新。','把 firstX 改成4，解释第二点为什么不再更新。','给第二点改错标签，观察只保证当前更新而不保证全局收敛。'],expected:'默认 firstX=2：两次更新后 w=[3,-1]；两个有符号间隔均为5。firstX=4时只更新一次，w=[4,1]。',code:`const firstX = 2;
const samples = [{x:[firstX,1],y:1},{x:[-1,2],y:-1}];
let w = [0,0];
for (const {x,y} of samples) {
  const before = [...w];
  const score = w.reduce((s,v,j)=>s+v*x[j],0);
  const violation = y*score <= 0;
  if (violation) w = w.map((v,j)=>v+y*x[j]);
  console.log({x,y,before,score,signedMargin:y*score,updated:violation,after:[...w]});
}
console.log({finalWeights:w, margins:samples.map(({x,y})=>y*w.reduce((s,v,j)=>s+v*x[j],0))});`};

  const kmState=(second,step)=>{
    const x=[0,2,8,10];let centers=[0,second],labels=x.map(v=>Math.abs(v-centers[0])<=Math.abs(v-centers[1])?0:1);
    for(let s=1;s<=step;s++){if(s%2===1)centers=centers.map((c,k)=>{const group=x.filter((_,i)=>labels[i]===k);return group.length?sum(group)/group.length:c;});else labels=x.map(v=>Math.abs(v-centers[0])<=Math.abs(v-centers[1])?0:1);}
    return{x,centers,labels,sse:sum(x.map((v,i)=>(v-centers[labels[i]])**2))};
  };
  V['cs229-13']={title:'k-means 的两步：分配点，再移动中心',param:'第二个初始中心 μ₂',min:2,max:10,step:1,value:10,steps:['固定初始中心，分配样本','固定分配，中心移到均值','用新中心重新分配','再次更新中心','检查目标与局部解'],render(step,initial){
    const s=kmState(initial,Math.min(step,3)),px=x=>65+x*48,initialState=kmState(initial,0);
    let svg=text(28,29,'一维数据：0、2、8、10；欧氏平方距离','v-title')+line(55,162,590,162,'v-axis');
    s.x.forEach((x,i)=>{const k=s.labels[i],color=k===0?'#65b6f3':'#e6bc73';svg+=`<line x1="${px(x)}" y1="150" x2="${px(s.centers[k])}" y2="224" stroke="${color}" stroke-width="1.4" opacity=".6"/>`+badge(px(x),145,String(x),color);});
    s.centers.forEach((c,k)=>{const color=k===0?'#65b6f3':'#e6bc73';svg+=`<path d="M ${px(c)} 214 l -9 16 h 18 Z" fill="${color}"/>`+text(px(c),258,`μ${k+1}=${f(c)}`,'v-small v-center');});
    svg+=text(610,108,`SSE = ${f(s.sse)}`,'v-title')+text(610,150,`初始 ${f(initialState.sse)}`,'v-small')+text(65,302,'圆点：固定的数据；三角形：当前中心；连线：当前分配。','v-small');
    const bodies=[`中心初始在0与${initial}。对每个样本比较到两个中心的平方距离，距离相同则分给第一个中心。这一步只改分配，不改中心。默认初始中心0和10，SSE为8。`,`固定簇分配以后，让每个中心等于自己簇内数据的均值，才会使该簇平方误差最小。默认左簇{0,2}和右簇{8,10}，中心变为1与9，SSE降为4。`,`中心改变后，需要重新检查所有分配。如果初始第二中心很靠左，例如2，上一轮会出现{0}与{2,8,10}；均值移动后，样本2可能换到左侧。`,`再次固定分配并更新均值。每次分配步与均值步都不增加目标。若某簇为空，本实验保留该簇旧中心；真实系统也需要明确空簇策略。`,`默认例子已经稳定在中心1和9，SSE为4。这个容易的一维数据不能证明任意数据都能找到全局最优；更复杂的数据需要多次初始化，并检查簇是否符合任务含义。`];
    return{svg,metrics:{centers:s.centers,labels:s.labels,sse:s.sse,initialSse:initialState.sse},formula:'分配：cᵢ=argminₖ|xᵢ−μₖ|²；更新：μₖ=簇内均值；J=Σᵢ|xᵢ−μcᵢ|²',body:bodies[step],result:`中心 [${s.centers.map(f).join(', ')}] · SSE ${f(s.sse)}`,note:'硬分配聚类；目标会下降，但不意味着所得簇就是自然类别。相等距离取较小簇索引。'};
  }};
  C['cs229-13']={name:'k-means：分别记录分配步与均值步的 SSE',instructions:['先手算默认两个簇的均值和SSE。','把 initialSecond 改成2，观察样本2何时换簇。','分别核验分配步和均值步的目标都没有上升。'],expected:'初始中心[0,10]：SSE=8；第一次均值更新后中心[1,9]，SSE=4；后续稳定。',code:`const x = [0,2,8,10], initialSecond = 10;
let centers = [0,initialSecond], previousObjective = Infinity;
const assign = () => x.map(v=>(v-centers[0])**2<=(v-centers[1])**2?0:1);
const objective = labels => x.reduce((s,v,i)=>s+(v-centers[labels[i]])**2,0);
for (let iteration=0;iteration<3;iteration++) {
  const labels=assign(), before=objective(labels);
  if(before>previousObjective+1e-10) throw Error('分配步不应增大目标');
  console.log({iteration,phase:'assignment',centers:[...centers],labels,sse:before});
  centers=centers.map((old,k)=>{
    const group=x.filter((_,i)=>labels[i]===k);
    return group.length?group.reduce((a,b)=>a+b,0)/group.length:old;
  });
  const after=objective(labels);
  if (after>before+1e-10) throw Error('均值步不应增大目标');
  previousObjective=after;
  console.log({iteration,phase:'mean update',centers:[...centers],sse:after});
}`};

  const normal=(x,mean,variance)=>Math.exp(-((x-mean)**2)/(2*variance))/Math.sqrt(2*Math.PI*variance);
  const emStep=middle=>{
    const xs=[-1,middle,2],means=[-1,2],vars=[1,1],mix=[.5,.5];
    const r=xs.map(x=>{const a=normal(x,-1,1),b=normal(x,2,1);return[a/(a+b),b/(a+b)];});
    const nk=[0,1].map(k=>sum(r.map(row=>row[k]))),newMeans=[0,1].map(k=>sum(xs.map((x,i)=>r[i][k]*x))/nk[k]);
    const newVars=[0,1].map(k=>sum(xs.map((x,i)=>r[i][k]*(x-newMeans[k])**2))/nk[k]),newMix=nk.map(n=>n/3);
    const ll=(mu,va,pi)=>sum(xs.map(x=>Math.log(sum(mu.map((m,k)=>pi[k]*normal(x,m,va[k]))))));
    return{xs,r,nk,newMeans,newVars,newMix,before:ll(means,vars,mix),after:ll(newMeans,newVars,newMix)};
  };
  V['cs229-14']={title:'EM：把模糊的归属变成软权重',param:'中间观测 x',min:-2,max:3,step:.25,value:0,steps:['两个高斯解释同一观测','E步：归一化相对似然','把责任度当作软计数','M步：加权更新参数','验证观测对数似然'],render(step,middle){
    const s=emStep(middle),updated=step>=3,mu=updated?s.newMeans:[-1,2],va=updated?s.newVars:[1,1],pi=updated?s.newMix:[.5,.5],px=x=>55+(x+4)*48;
    const xs=Array.from({length:121},(_,i)=>-4+i*.075),maximum=Math.max(.25,...xs.flatMap(x=>mu.map((m,k)=>pi[k]*normal(x,m,va[k])))),py=y=>246-y/maximum*145;
    let svg=text(28,29,'初始 μ=[−1,2]，σ²=[1,1]，π=[½,½]','v-title')+line(55,246,490,246,'v-axis');
    mu.forEach((m,k)=>{svg+=curve(xs.map(x=>[x,pi[k]*normal(x,m,va[k])]),px,py,k===0?'#65b6f3':'#e5bf6b');});
    for(const x of [-3,-1,0,2,4])svg+=text(px(x),269,x,'v-small v-center');
    svg+=line(px(middle),72,px(middle),246,'v-yellow')+text(535,82,`x=${f(middle)} 的责任度`,'v-title');
    if(step>=1){svg+=`<rect x="535" y="105" width="${175*s.r[1][0]}" height="20" fill="#65b6f3"/><rect x="${535+175*s.r[1][0]}" y="105" width="${175*s.r[1][1]}" height="20" fill="#e5bf6b"/>`+text(535,149,`[${s.r[1].map(f).join(', ')}]`,'v-small');}
    if(step>=2)svg+=text(535,190,`软计数 Nₖ=[${s.nk.map(f).join(', ')}]`,'v-small');
    if(step>=3)svg+=text(535,224,`新 μ=[${s.newMeans.map(f).join(', ')}]`,'v-small')+text(535,254,`新 π=[${s.newMix.map(f).join(', ')}]`,'v-small');
    svg+=text(55,307,updated?'曲线为 M 步后的加权密度；责任度仍标示本轮 E 步结果。':'曲线为 πₖ·N(x;μₖ,σ²ₖ)，不是已归一化的责任度。','v-small');
    const bodies=[`中间观测x=${f(middle)}可以由两个高斯共同解释。比较两个分量在该点的加权密度，而不是直接把它硬分给最近的均值。固定样本集为[-1, x, 2]。`,`E步将两个加权密度除以它们的和。默认x=0时，责任度是[0.817574,0.182426]；它们之和为1。这个数表示当前参数下的后验归属，不是已经观测到的标签。`,`对全部3个观测都计算责任度，然后按分量求和，得到软计数Nₖ=[${s.nk.map(f).join(', ')}]。一个观测的质量可以被分给两个簇，软计数不要求是整数。`,`M步用责任度加权，分别更新混合权重、均值和方差。新均值是[${s.newMeans.map(f).join(', ')}]。注意方差要围绕新均值计算；只更新均值而仍声称完成了完整GMM M步是不准确的。`,`本轮观测对数似然从${f(s.before)}变成${f(s.after)}，变化${f(s.after-s.before)}。精确EM不降低它，但这不保证全局最优；方差塌缩或局部极值仍需要防范。`];
    return{svg,metrics:{responsibilities:s.r,counts:s.nk,means:s.newMeans,variances:s.newVars,weights:s.newMix,logLikelihoodBefore:s.before,logLikelihoodAfter:s.after,improvement:s.after-s.before},formula:'rᵢₖ=πₖN(xᵢ;μₖ,σ²ₖ)/ΣⱼπⱼN(xᵢ;μⱼ,σ²ⱼ)；μ′ₖ=Σᵢrᵢₖxᵢ/Σᵢrᵢₖ',body:bodies[step],result:`r(x)=[${s.r[1].map(f).join(', ')}] · 对数似然提升 ${f(s.after-s.before)}`,note:'三观测、两个一维高斯的一次完整E/M迭代；初始参数固定。图线重新缩放以显示本轮密度。'};
  }};
  C['cs229-14']={name:'GMM 的一次完整 E/M：责任度、均值、方差与似然',instructions:['先预测x=0更属于哪个高斯，估计责任度。','改变 middle，比较软计数与更新后的均值。','检查新方差围绕新均值计算，并验证对数似然未下降。'],expected:'middle=0 时责任度≈[0.817574,0.182426]；更新均值≈[-0.532049,1.663563]，对数似然从−5.112748升至−4.076263，提升约1.036485。',code:`const middle = 0, xs = [-1,middle,2];
const means = [-1,2], variances = [1,1], weights = [0.5,0.5];
const normal = (x,m,v) => Math.exp(-((x-m)**2)/(2*v))/Math.sqrt(2*Math.PI*v);
const sum = xs => xs.reduce((a,b)=>a+b,0);
const responsibilities = xs.map(x=>{
  const p=means.map((m,k)=>weights[k]*normal(x,m,variances[k]));
  return p.map(v=>v/sum(p));
});
const counts=means.map((_,k)=>sum(responsibilities.map(r=>r[k])));
const nextMeans=means.map((_,k)=>sum(xs.map((x,i)=>responsibilities[i][k]*x))/counts[k]);
const nextVariances=means.map((_,k)=>sum(xs.map((x,i)=>responsibilities[i][k]*(x-nextMeans[k])**2))/counts[k]);
const nextWeights=counts.map(n=>n/xs.length);
const logLikelihood=(mu,va,pi)=>sum(xs.map(x=>Math.log(sum(mu.map((m,k)=>pi[k]*normal(x,m,va[k]))))));
const before=logLikelihood(means,variances,weights),after=logLikelihood(nextMeans,nextVariances,nextWeights);
console.log({responsibilities,counts,nextMeans,nextVariances,nextWeights,before,after,improvement:after-before});
if(after<before-1e-10) throw Error('精确 EM 不应降低观测对数似然');`};

  V['cs229-15']={title:'因子分析：共享方向与独立噪声如何相加',param:'第一维独立噪声方差 ψ₁',min:.25,max:9,step:.25,value:1,steps:['一个潜变量驱动两维观测','共享因子产生相关性','独立噪声补上对角线','给定观测，推断潜变量','区分方向与不确定性'],render(step,noise){
    const a=4+noise,b=2,d=5,disc=Math.sqrt((a-d)**2+4*b*b),eig1=(a+d+disc)/2,eig2=(a+d-disc)/2,angle=.5*Math.atan2(2*b,a-d)*180/Math.PI,postVar=1/(1+4/noise+1/4),postMean=postVar*(4/noise+1/4),px=x=>240+x*31,py=y=>173-y*31;
    let svg=text(28,29,'Λ=[2,1]ᵀ，Ψ=diag(ψ₁,4)，μ=0','v-title')+line(70,173,410,173,'v-axis')+line(240,48,240,303,'v-axis')+text(415,178,'x₁','v-small')+text(248,54,'x₂','v-small');
    svg+=line(px(-3),py(-1.5),px(3),py(1.5),'v-contour')+arrow(px(0),py(0),px(2),py(1),'v-yellow')+text(px(2)+5,py(1)-10,'Λ','v-small');
    if(step>=2)svg+=`<ellipse cx="240" cy="173" rx="${31*Math.sqrt(eig1)}" ry="${31*Math.sqrt(eig2)}" transform="rotate(${-angle} 240 173)" fill="#65b6f31a" stroke="#65b6f3" stroke-width="2"/>`;
    if(step>=3)svg+=point(px(2),py(1),6,'v-dot')+text(275,105,'观测 x=(2,1)','v-small');
    svg+=text(485,77,'共享协方差 ΛΛᵀ','v-title')+text(505,108,'[ 4  2 ]','v-small')+text(505,133,'[ 2  1 ]','v-small');
    if(step>=2)svg+=text(485,173,'总协方差 Σ','v-title')+text(505,204,`[ ${f(a)}  2.000 ]`,'v-small')+text(505,229,'[ 2.000  5.000 ]','v-small');
    if(step>=3)svg+=text(485,270,`E[z|x]=${f(postMean)}`,'v-small')+text(485,298,`Var[z|x]=${f(postVar)}`,'v-small');
    const bodies=[`潜变量z是一个标量；载荷Λ=[2,1]ᵀ把它映射成二维方向。若没有噪声，所有观测都在x₂=x₁/2这条直线上。这里的箭头是载荷方向，不是某个样本的主成分估计。`,`因为Var(z)=1，共享协方差是ΛΛᵀ=[[4,2],[2,1]]。两个观测维度的协方差2来自同一个潜在因素；这是低秩、只有一条有效方向的结构。`,`再加入独立噪声Ψ=diag(${f(noise)},4)，只增加对角项，因此总协方差为[[${f(a)},2],[2,5]]。默认ψ₁=1时得到[[5,2],[2,5]]。非对角相关不会由独立噪声直接创造。`,`给定观测x=[2,1]，先验z~N(0,1)与噪声模型共同决定后验。后验方差是(1+ΛᵀΨ⁻¹Λ)⁻¹=${f(postVar)}，后验均值是这个方差乘ΛᵀΨ⁻¹x=${f(postMean)}。`,`默认后验均值17/21≈0.809524、方差4/21≈0.190476。观测恰好等于Λ并不意味着z必定为1，因为模型仍允许噪声和先验收缩。增大第一维噪声，会减少该维对潜变量推断的信任。`];
    return{svg,metrics:{covariance:[[a,b],[b,d]],posteriorMean:postMean,posteriorVariance:postVar},formula:'Σ=ΛΛᵀ+Ψ；S=(I+ΛᵀΨ⁻¹Λ)⁻¹；E[z|x]=SΛᵀΨ⁻¹(x−μ)',body:bodies[step],result:`Cov₁₂=2 · 后验均值 ${f(postMean)} · 后验方差 ${f(postVar)}`,note:'蓝椭圆满足xᵀΣ⁻¹x=1（不是95%置信椭圆）。载荷与模型假设已知，未把因子命名为真实因果因素。'};
  }};
  C['cs229-15']={name:'因子分析：算出协方差与潜变量后验',instructions:['先手算ΛΛᵀ，再加上独立噪声对角线。','把 psi1 从1改成9，观察后验方差是否增大。','解释为什么观测x=[2,1]仍不能断言z=1。'],expected:'默认 covariance=[[5,2],[2,5]]；posteriorMean=17/21≈0.809524，posteriorVariance=4/21≈0.190476。',code:`const loading = [2,1], psi1 = 1, noise = [psi1,4], x = [2,1];
const covariance=loading.map((a,i)=>loading.map((b,j)=>a*b+(i===j?noise[i]:0)));
const posteriorPrecision=1+loading.reduce((s,a,i)=>s+a*a/noise[i],0);
const posteriorVariance=1/posteriorPrecision;
const posteriorMean=posteriorVariance*loading.reduce((s,a,i)=>s+a*x[i]/noise[i],0);
console.log({covariance,posteriorPrecision,posteriorMean,posteriorVariance});
// 共同因子只负责非对角相关；独立噪声只加到对角线。
if(Math.abs(covariance[0][1]-2)>1e-12) throw Error('协方差结构错误');`};
})();
