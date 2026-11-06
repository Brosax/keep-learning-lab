/* CME295 01–03: position geometry, decoding, and distribution distillation. */
(() => {
'use strict';
const {text,line,arrow,rect,node,point,fmt,softmax}=window.MLVis;
const V=window.COURSE_VISUALS ||= {},C=window.COURSE_CODE ||= {};
const title=s=>text(24,28,s,'v-title');
const rotate=(v,a)=>[v[0]*Math.cos(a)-v[1]*Math.sin(a),v[0]*Math.sin(a)+v[1]*Math.cos(a)];
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
function rope(delta){const q=[1,2],k=[2,1],theta=Math.PI/2,shift=2,rotQ=rotate(q,0),rotK=rotate(k,delta*theta),shiftedQ=rotate(q,shift*theta),shiftedK=rotate(k,(shift+delta)*theta);return {rotQ,rotK,shiftedQ,shiftedK,score:dot(rotQ,rotK),shiftedScore:dot(shiftedQ,shiftedK),normQSquared:dot(rotQ,rotQ),normKSquared:dot(rotK,rotK),relativeFormula:4*Math.cos(delta*theta)+3*Math.sin(delta*theta)};}
V['cme295-01']={title:'RoPE：内积怎样记住相对位置？',param:'key 相对 query 的位置差 Δ',min:0,max:4,step:.5,value:1,steps:['先看内容向量','让位置控制旋转角度','共同平移两个位置','比较内积与向量长度'],render(step,delta){
 const m=rope(delta);let svg=title('二维教学频率 θ=π/2；q=[1,2]，k=[2,1]');
 function plot(cx,cy,q,k,label){let out=text(cx,62,label,'v-center v-small')+line(cx-115,cy,cx+115,cy,'v-axis')+line(cx,cy-115,cx,cy+115,'v-axis')+`<circle cx="${cx}" cy="${cy}" r="${Math.sqrt(5)*42}" class="v-contour"/>`;out+=arrow(cx,cy,cx+q[0]*42,cy-q[1]*42,'v-yellow')+arrow(cx,cy,cx+k[0]*42,cy-k[1]*42,'v-teal');out+=text(cx-95,310,'黄：query　绿：key','v-small');return out;}
 svg+=plot(180,190,step===0?[1,2]:m.rotQ,step===0?[2,1]:m.rotK,step===0?'未加位置：内积4':`位置0与${fmt(delta,1)}`);
 if(step>=2)svg+=plot(530,190,m.shiftedQ,m.shiftedK,`两个位置都加2：2与${fmt(delta+2,1)}`);
 else svg+=node(385,125,315,'旋转不改变向量长度','位置差改变方向关系',step===1);
 if(step>=3)svg+=text(380,106,`内积 ${fmt(m.score,5)} = ${fmt(m.shiftedScore,5)}`,'v-center v-title');
 const bodies=['q、k首先编码内容。此例取q=[1,2]、k=[2,1]，未加入位置的内积为4，两个向量长度平方均为5。圆表示旋转前后保持的长度。',`把位置p变成角度pπ/2。query位于0，key位于Δ=${fmt(delta,1)}，故key旋转${fmt(delta*90,1)}°。旋转后的内积为${fmt(m.score,6)}。实际RoPE使用多个二维通道对和多种频率；此处只抽出其中一对。`,`同时给query与key的位置加2，它们都再旋转180°。共同旋转不改变夹角，内积仍为${fmt(m.shiftedScore,6)}，而各自坐标可能完全改变。`,`R(mθ)q与R(nθ)k的内积可化为qᵀR((n−m)θ)k。本例是4cos(Δπ/2)+3sin(Δπ/2)。两向量范数平方均保持5。只依赖相对位置不等于距离越远分数必然越低，也不能保证任意长度外推。`];
 return {svg,metrics:m,formula:'(R(mθ)q)ᵀ(R(nθ)k)=qᵀR((n−m)θ)k；本例=4cos(Δπ/2)+3sin(Δπ/2)',body:bodies[step],result:`score=${fmt(m.score,6)} · 共同平移后=${fmt(m.shiftedScore,6)} · 范数平方=${fmt(m.normQSquared)}, ${fmt(m.normKSquared)}`,note:'社区机制算例：连续滑杆允许半格位置以观察旋转；实际token位置通常为整数。RoPE不替代因果遮罩、残差或前馈层。'};
}};
C['cme295-01']={name:'旋转位置编码：验证相对位置恒等式',instructions:['运行默认delta=1，核对内积3与两个范数平方5。','将shift从2改成任意整数，检查内积是否保持。','把delta改成0和2，解释分数4与−4，避免把它理解成概率。'],expected:'默认score=shiftedScore≈3，rotK≈[−1,2]；shift=2后shiftedQ≈[−1,−2]、shiftedK≈[1,−2]。',code:`const q=[1,2],k=[2,1],delta=1,shift=2,theta=Math.PI/2;
const rotate=(v,a)=>[v[0]*Math.cos(a)-v[1]*Math.sin(a),v[0]*Math.sin(a)+v[1]*Math.cos(a)];
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
const rotQ=rotate(q,0),rotK=rotate(k,delta*theta);
const shiftedQ=rotate(q,shift*theta),shiftedK=rotate(k,(shift+delta)*theta);
const score=dot(rotQ,rotK),shiftedScore=dot(shiftedQ,shiftedK);
const relativeFormula=4*Math.cos(delta*theta)+3*Math.sin(delta*theta);
console.log({rotQ,rotK,shiftedQ,shiftedK,score,shiftedScore,relativeFormula,
 normQSquared:dot(rotQ,rotQ),normKSquared:dot(rotK,rotK),translationError:Math.abs(score-shiftedScore)});`};

const baseProb=[.6,.25,.1,.05];
function nucleus(temperature){const distribution=softmax(baseProb.map(p=>Math.log(p)/temperature));const order=distribution.map((p,i)=>({p,i})).sort((a,b)=>b.p-a.p||a.i-b.i);let mass=0;const topPIndices=[];for(const item of order){topPIndices.push(item.i);mass+=item.p;if(mass+1e-12>=.8)break;}
 const normalize=indices=>{const total=indices.reduce((s,i)=>s+distribution[i],0);return distribution.map((p,i)=>indices.includes(i)?p/total:0);};return {distribution,topPIndices,retainedMass:mass,topPDistribution:normalize(topPIndices),topKDistribution:normalize(order.slice(0,2).map(item=>item.i)),entropy:-distribution.reduce((s,p)=>s+p*Math.log(p),0)};}
V['cme295-02']={title:'先调温度，再筛候选：top-p 不等于固定 top-k',param:'采样温度 T',min:.5,max:2,step:.25,value:1,steps:['固定模型的四个logit','温度改变概率但不改参数','按累计概率决定候选集','截断后重新归一化'],render(step,T){
 const m=nucleus(T);let svg=title('logits=log([0.60,0.25,0.10,0.05])，top-p=0.80');
 const row=(y,label,values,highlight=false)=>{let out=text(24,y+18,label,'v-small');values.forEach((p,i)=>{const x=220+i*125;out+=rect(x,y,105,22,'v-node',3)+`<rect x="${x}" y="${y}" width="${105*p}" height="22" rx="3" fill="${highlight&&!m.topPIndices.includes(i)?'#53657d':'#50dfc2'}"/>`+text(x+52,y+43,`${'ABCD'[i]} ${fmt(p,3)}`,'v-center v-small');});return out;};
 svg+=row(66,step===0?'原始概率':'温度后概率',step===0?baseProb:m.distribution);
 if(step>=2)svg+=text(25,157,`保留 ${m.topPIndices.map(i=>'ABCD'[i]).join('、')}；累计质量 ${fmt(m.retainedMass,5)} ≥ 0.80`);
 if(step>=3)svg+=row(182,'top-p 归一化',m.topPDistribution,true)+row(260,'固定 top-k=2',m.topKDistribution);
 const bodies=['logits固定为原始概率的自然对数，温度为1时softmax恰好返回[0.6,0.25,0.1,0.05]。它们描述同一输入下的四个候选；实验不会请求模型或生成真实文本。',`先将logits除以T=${fmt(T,2)}再softmax。概率变为[${m.distribution.map(p=>fmt(p,4)).join(', ')}]。温度低时更尖锐，温度高时更平缓；排序没有变化，候选质量也没有被事实核查。`,`按降序累加，直到首次达到或超过0.8。当前最小前缀包含${m.topPIndices.length}项，累计质量${fmt(m.retainedMass,6)}。top-k=2始终保留两项，因此它与top-p只在部分设置下相同。`,`保留项除以累计质量，其余概率置0。得到[${m.topPDistribution.map(p=>fmt(p,5)).join(', ')}]，和为1。T=0.5时首项本身超过0.8，top-p仅留A；T=2时需要A、B、C，单纯固定两项无法复现这种变化。`];
 return {svg,metrics:m,formula:'p(T)=softmax(z/T)；S=达到累计质量0.8的最小降序前缀；p_filtered(i)=p_i/Σ_{j∈S}p_j',body:bodies[step],result:`保留${m.topPIndices.length}项 · 概率和=${fmt(m.topPDistribution.reduce((a,b)=>a+b,0),6)} · 熵=${fmt(m.entropy,6)}`,note:'实现先调温度再截断；不同服务的参数组合约定可能不同，应记录顺序。累计达到阈值即停止（1e−12容差处理浮点舍入）；并列概率按原索引排序。'};
}};
C['cme295-02']={name:'解码分布：精确算出温度与核采样的顺序',instructions:['运行T=1，核对top-p归一化后的12/17与5/17。','分别设temperature=0.5和2，比较候选个数1与3。','尝试topP=0.9，保留首次跨过阈值的那个候选，不能只保留累计概率低于阈值的项。'],expected:'默认topPIndices=[0,1]、retainedMass=0.85，topPDistribution≈[0.705882,0.294118,0,0]；T=.5只留A，T=2留A/B/C。',code:`const original=[0.6,0.25,0.1,0.05],temperature=1,topP=0.8,topK=2;
const scaled=original.map(p=>Math.log(p)/temperature),max=Math.max(...scaled);
const weights=scaled.map(z=>Math.exp(z-max)),sum=weights.reduce((a,b)=>a+b,0);
const distribution=weights.map(w=>w/sum);
const ordered=distribution.map((p,i)=>({p,i})).sort((a,b)=>b.p-a.p||a.i-b.i);
let retainedMass=0;const topPIndices=[];
for(const item of ordered){topPIndices.push(item.i);retainedMass+=item.p;if(retainedMass+1e-12>=topP)break;}
function renormalize(indices){const mass=indices.reduce((s,i)=>s+distribution[i],0);return distribution.map((p,i)=>indices.includes(i)?p/mass:0);}
const topPDistribution=renormalize(topPIndices),topKDistribution=renormalize(ordered.slice(0,topK).map(x=>x.i));
console.log({distribution,topPIndices,retainedMass,topPDistribution,topKDistribution,
 probabilitySum:topPDistribution.reduce((a,b)=>a+b,0)});`};

function distill(T){const teacherProb=softmax([Math.log(4)/T,0]),studentProb=[.5,.5],kl=teacherProb.reduce((s,p,i)=>s+p*Math.log(p/studentProb[i]),0),loss=T*T*kl,gradient=studentProb.map((p,i)=>T*(p-teacherProb[i])),alpha=.5,logits=gradient.map(g=>-alpha*g),nextStudentProb=softmax(logits.map(z=>z/T)),nextLoss=T*T*teacherProb.reduce((s,p,i)=>s+p*Math.log(p/nextStudentProb[i]),0);
 const lossAt=z=>{const p=softmax(z.map(x=>x/T));return T*T*teacherProb.reduce((s,t,i)=>s+t*Math.log(t/p[i]),0);};const eps=1e-5,numericGradient=[0,1].map(i=>{const plus=[0,0],minus=[0,0];plus[i]=eps;minus[i]=-eps;return (lossAt(plus)-lossAt(minus))/(2*eps);});return {teacherProb,studentProb,kl,loss,gradient,numericGradient,nextStudentProb,nextLoss};}
V['cme295-03']={title:'蒸馏的监督是一个分布，不只是正确标签',param:'蒸馏温度 T',min:1,max:4,step:.5,value:1,steps:['教师和学生各给一个分布','用KL比较完整分布','温度平方缩放后的梯度','对学生logits更新一次'],render(step,T){
 const m=distill(T);let svg=title('教师 logits=[ln4,0]；学生 logits=[0,0]');
 const bars=(y,label,values,color)=>{let out=text(25,y+18,label,'v-small');values.forEach((p,i)=>{const x=245+i*235;out+=rect(x,y,210,22,'v-node',3)+`<rect x="${x}" y="${y}" width="${210*p}" height="22" fill="${color}"/>`+text(x+105,y+43,`${'AB'[i]} ${fmt(p,5)}`,'v-center v-small');});return out;};
 svg+=bars(60,'教师 softmax(z/T)',m.teacherProb,'#50dfc2')+bars(126,'学生 softmax(s/T)',m.studentProb,'#ffe38a');
 if(step>=1)svg+=text(25,206,`KL=${fmt(m.kl,6)}；T²KL=${fmt(m.loss,6)}`);
 if(step>=2)svg+=text(25,240,`∂L/∂s = [${m.gradient.map(g=>fmt(g,5)).join(', ')}]`);
 if(step>=3)svg+=bars(268,'更新后学生 (α=.5)',m.nextStudentProb,'#62a7ef');
 const bodies=[`教师与学生在同一个前缀上给出两类logit。T=${fmt(T,2)}时教师概率为[${m.teacherProb.map(p=>fmt(p,5))}]；学生仍为[0.5,0.5]。改变温度会软化教师监督，不会产生新的真实标签。`,`使用KL(教师||学生)=Σp_teacher log(p_teacher/p_student)。当前KL为${fmt(m.kl,6)}；乘T²得到训练损失${fmt(m.loss,6)}。教师熵在对学生求导时为常数，因此KL与软标签交叉熵数值不同、学生梯度相同。`,`对学生原始logit求导得到T(p_student−p_teacher)，当前为[${m.gradient.map(g=>fmt(g,6))}]。不是简单地去掉温度因子，也不是用硬标签[1,0]替换教师分布。中心差分独立核对了这两个导数。`,`以α=0.5只更新学生logits，学生温度分布成为[${m.nextStudentProb.map(p=>fmt(p,5))}]，损失从${fmt(m.loss,6)}降为${fmt(m.nextLoss,6)}。这是一条固定前缀的本地分布匹配，不是on-policy轨迹训练，更不能证明学生取得了教师的全部能力。`];
 return {svg,metrics:m,formula:'L=T² KL(p_teacher(T)||p_student(T))；∂L/∂s_i=T[p_student,i(T)−p_teacher,i(T)]',body:bodies[step],result:`损失 ${fmt(m.loss,6)} → ${fmt(m.nextLoss,6)} · 梯度和=${fmt(m.gradient.reduce((a,b)=>a+b,0),8)}`,note:'教师分布固定，梯度只作用于学生logits。实际蒸馏还需选择状态分布、任务验证与教师质量检查；本例不调用任何模型。'};
}};
C['cme295-03']={name:'温度蒸馏：KL损失、解析梯度与数值检查',instructions:['手算T=1时教师[.8,.2]、学生[.5,.5]以及KL损失。','设temperature=2，检查teacherProb=[2/3,1/3]与梯度[-1/3,1/3]。','保留T²损失缩放，比较解析梯度与中心差分；再移除它观察梯度尺度变化。'],expected:'默认KL=loss≈0.192744757，gradient≈[-.3,.3]；一步更新后第一类概率≈.574443，损失下降。',code:`const temperature=1,teacherLogits=[Math.log(4),0],studentLogits=[0,0],alpha=0.5,epsilon=1e-5;
function probabilities(logits){const scaled=logits.map(z=>z/temperature),max=Math.max(...scaled),w=scaled.map(z=>Math.exp(z-max)),sum=w.reduce((a,b)=>a+b,0);return w.map(v=>v/sum);}
const teacherProb=probabilities(teacherLogits),studentProb=probabilities(studentLogits);
const lossAt=logits=>{const p=probabilities(logits);return temperature**2*teacherProb.reduce((s,t,i)=>s+t*Math.log(t/p[i]),0);};
const loss=lossAt(studentLogits),kl=loss/temperature**2;
const gradient=studentProb.map((p,i)=>temperature*(p-teacherProb[i]));
const numericGradient=studentLogits.map((_,i)=>{const plus=[...studentLogits],minus=[...studentLogits];plus[i]+=epsilon;minus[i]-=epsilon;return (lossAt(plus)-lossAt(minus))/(2*epsilon);});
const nextLogits=studentLogits.map((z,i)=>z-alpha*gradient[i]);
const nextStudentProb=probabilities(nextLogits),nextLoss=lossAt(nextLogits);
console.log({teacherProb,studentProb,kl,loss,gradient,numericGradient,nextStudentProb,nextLoss});`};
})();
