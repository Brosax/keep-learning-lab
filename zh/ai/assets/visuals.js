/* OpenSEEI mathematical intuition labs: deterministic, local and dependency-free. */
(() => {
  'use strict';
  let timer = null;
  let mounted = null;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => Number.isFinite(n) ? n.toFixed(3) : '超出范围';
  const softmax = values => { const max = Math.max(...values); const exp = values.map(v => Math.exp(v - max)); const sum = exp.reduce((a,b) => a+b,0); return exp.map(v => v/sum); };
  const text = (x,y,value,cls='') => `<text x="${x}" y="${y}" class="${cls}">${esc(value)}</text>`;
  const line = (x1,y1,x2,y2,cls='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
  const rect = (x,y,w,h,cls='',rx=9) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${cls}"/>`;
  const node = (x,y,w,label,sub,active=false) => `${rect(x,y,w,66,active?'v-node active':'v-node')}${text(x+w/2,y+27,label,'v-center v-node-title')}${text(x+w/2,y+48,sub,'v-center v-small')}`;
  const grid = `<defs><pattern id="visual-grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M 25 0 L 0 0 0 25" fill="none" stroke="#233044" stroke-width=".6"/></pattern><marker id="visual-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker></defs><rect width="760" height="330" fill="url(#visual-grid)"/>`;
  const arrow = (x1,y1,x2,y2,cls='v-edge') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" marker-end="url(#visual-arrow)"/>`;
  const configs = {
    cs229: {title:'把梯度下降看成沿等高线下山',param:'学习率 α',min:.05,max:.75,step:.05,value:.2,steps:['初始位置','第 1 次更新','第 2 次更新','第 3 次更新','第 4 次更新','第 5 次更新','第 6 次更新'],render:gradient},
    cs230: {title:'一个神经元：数值如何流动，梯度如何返回',param:'权重 w',min:-2,max:2,step:.1,value:.8,steps:['输入与参数','线性组合','非线性激活','计算损失','局部导数','链式法则'],render:neuron},
    cme295: {title:'注意力：向量方向如何变成信息权重',param:'Query 方向 θ（度）',min:0,max:180,step:5,value:45,steps:['向量的几何直觉','点积得到分数','Softmax 归一化','加权汇总 Value'],render:attention},
    cs336: {title:'从一个 token 到下一个 token 的形状旅程',param:'观察第几个 token',min:1,max:3,step:1,value:3,steps:['离散 token','Embedding','因果注意力','MLP 与残差','下一 token 分布'],render:transformer},
    cs329z: {title:'Agent 的决策循环与停止边界',param:'最多允许工具调用次数',min:1,max:3,step:1,value:2,steps:['制订计划','第一次工具调用','观察返回值','评估证据','第二次工具调用','再次观察','验证结论','停止'],render:agent}
  };
  function gradient(step, alpha) {
    const theta = i => [2.2*Math.pow(1-alpha,i),1.3*Math.pow(1-3*alpha,i)];
    const [x,y] = theta(step); const [nx,ny] = theta(step+1);
    const extent = Math.max(2.8,...Array.from({length:step+2},(_,i)=>theta(i)).flat().map(Math.abs));
    const scale = Math.min(45,125/extent);
    const px = n => 245+n*scale, py = n => 169-n*scale;
    let svg = text(35,30,'L(θ) = ½(θ₁² + 3θ₂²)','v-title');
    for (const radius of [35,70,105,140,175]) svg += `<ellipse cx="245" cy="169" rx="${radius}" ry="${radius/Math.sqrt(3)}" class="v-contour"/>`;
    svg += line(40,169,450,169,'v-axis')+line(245,43,245,305,'v-axis')+text(455,174,'θ₁','v-small')+text(253,48,'θ₂','v-small');
    for(let i=0;i<step;i++) { const a=theta(i),b=theta(i+1); svg+=line(px(a[0]),py(a[1]),px(b[0]),py(b[1]),'v-trail'); }
    for(let i=0;i<=step;i++){const p=theta(i);svg+=`<circle cx="${px(p[0])}" cy="${py(p[1])}" r="${i===step?6:3}" class="${i===step?'v-dot':'v-history'}"/>`;}
    // Arrow is one exact parameter update, not a normalized direction.
    svg+=arrow(px(x),py(y),px(nx),py(ny),'v-yellow')+text(495,80,`迭代 t = ${step}`,'v-title')+text(495,119,`θ = (${fmt(x)}, ${fmt(y)})`,'v-small')+text(495,151,`∇L = (${fmt(x)}, ${fmt(3*y)})`,'v-small')+text(495,183,`L = ${fmt(.5*(x*x+3*y*y))}`,'v-small')+text(495,233,'黄色箭头：下一次更新','v-small')+text(495,266,'中心：全局最小值 (0, 0)','v-small');
    return {svg,formula:`θₜ₊₁ = θₜ − α∇L(θₜ) = ((1−α)θ₁, (1−3α)θ₂)`,body:`蓝色椭圆表示相同的损失值。梯度垂直于等高线；负梯度给出局部下降方向。当前 α = ${fmt(alpha)}，从点 (${fmt(x)}, ${fmt(y)}) 沿黄色箭头更新到 (${fmt(nx)}, ${fmt(ny)})。${alpha<2/3?'这个二次函数在 0 < α < 2/3 时收敛。':'此时 α ≥ 2/3：陡峭方向会振荡并可能发散。逐步前进观察损失。'}`,result:`损失 ${fmt(.5*(x*x+3*y*y))} · 步数 ${step}`,note:'教学函数为二维正定二次函数；真实模型的损失通常不具备这样的全局凸性。'};
  }
  function neuron(step,w) {
    const x=2,b=-1,target=1,z=w*x+b,a=1/(1+Math.exp(-z)),loss=.5*(a-target)**2,da=a-target,dz=a*(1-a),dw=da*dz*x;
    let svg=text(30,30,'固定 x = 2，b = −1，目标 y = 1','v-title');
    const nodes=[[30,115,105,'x, w, b',`w = ${fmt(w)}`],[195,115,125,'z = wx + b',fmt(z)],[380,115,125,'a = σ(z)',fmt(a)],[565,115,155,'L = ½(a−y)²',fmt(loss)]];
    nodes.forEach((n,i)=>{if(i)svg+=arrow(nodes[i-1][0]+nodes[i-1][2],148,n[0]-8,148);svg+=node(...n,step===i);});
    if(step>=4){svg+=arrow(642,221,445,221,'v-yellow')+arrow(445,250,256,250,'v-yellow')+arrow(256,280,83,280,'v-yellow');svg+=text(543,210,`∂L/∂a = ${fmt(da)}`,'v-small v-center')+text(350,239,`∂a/∂z = ${fmt(dz)}`,'v-small v-center')+text(168,270,'∂z/∂w = x = 2','v-small v-center');}
    const bodies=[`输入 x 与参数 w、b 共同确定这个神经元。拖动 w 会同时改变预测与梯度，但目标值 y 保持为 1。`,`先做线性组合：z = ${fmt(w)} × 2 − 1 = ${fmt(z)}。这是计算图中第一个局部运算。`,`Sigmoid 把 z 映射到 (0,1)：a = 1/(1+exp(−z)) = ${fmt(a)}。它的局部斜率是 a(1−a)。`,`用平方损失衡量预测与目标的距离：L = ½(${fmt(a)}−1)² = ${fmt(loss)}。本例使用平方损失教学，不代表分类任务一定采用它。`,`反向传播从损失出发，沿计算图反向传递局部导数。每条边只需要当前算子的导数，不需要重新计算整个函数。`,`把路径上的导数相乘：∂L/∂w = (${fmt(da)}) × (${fmt(dz)}) × 2 = ${fmt(dw)}。梯度下降再用 w ← w − η∂L/∂w 更新参数。`];
    return {svg,formula:step<4?'z = wx + b → a = σ(z) → L = ½(a − y)²':`∂L/∂w = (a−y) · a(1−a) · x = ${fmt(dw)}`,body:bodies[step],result:`预测 ${fmt(a)} · 损失 ${fmt(loss)} · 权重梯度 ${fmt(dw)}`,note:'蓝色为前向值，黄色为反向导数；这是单样本、单神经元的完整链式法则。'};
  }
  function attention(step,angle) {
    const radians=angle*Math.PI/180,q=[Math.cos(radians),Math.sin(radians)],keys=[[1,0],[0,1],[-1,0]],values=[[1,0],[0,1],[-1,0]],dots=keys.map(k=>q[0]*k[0]+q[1]*k[1]),scores=dots.map(v=>v/Math.sqrt(2)),weights=softmax(scores),out=[weights[0]-weights[2],weights[1]];
    let svg=text(28,30,'dₖ = 2 · 三个 Key / Value','v-title')+line(45,180,320,180,'v-axis')+line(180,58,180,290,'v-axis');
    keys.forEach((k,i)=>{svg+=arrow(180,180,180+k[0]*90,180-k[1]*90,'v-teal')+text(180+k[0]*115,180-k[1]*110+5,`k${i+1}`,'v-small v-center');});
    svg+=arrow(180,180,180+q[0]*105,180-q[1]*105,'v-yellow')+text(180+q[0]*127,180-q[1]*127,'q','v-small v-center')+text(32,313,`q = (${fmt(q[0])}, ${fmt(q[1])})`,'v-small');
    keys.forEach((k,i)=>{const y=70+i*62;svg+=text(365,y,`k${i+1}`,'v-small');if(step>=1)svg+=text(403,y,`${fmt(scores[i])}`,'v-small');if(step>=2)svg+=rect(485,y-15,weights[i]*220,18,'v-fill-teal',2)+text(706,y,`${(100*weights[i]).toFixed(1)}%`,'v-small v-end');});
    if(step>=1)svg+=text(402,40,'q·k / √2','v-small');if(step>=2)svg+=text(492,40,'注意力权重','v-small');if(step>=3)svg+=text(366,279,`输出 = (${fmt(out[0])}, ${fmt(out[1])})`,'v-title');
    return {svg,formula:step===0?'q 与 k 越同向，点积越大':step===1?'sᵢ = (q · kᵢ) / √dₖ':step===2?'αᵢ = exp(sᵢ) / Σⱼ exp(sⱼ)':`o = Σᵢ αᵢvᵢ = (${fmt(out[0])}, ${fmt(out[1])})`,body:[`黄色向量是 Query，青色向量是三个 Key。拖动角度，让 Query 对准不同 Key。这里向量长度均为 1，点积就是方向夹角的余弦。`,`点积衡量 Query 与各 Key 的匹配程度。再除以 √dₖ 控制分数尺度。当前三个原始点积为 ${dots.map(fmt).join('、')}。`,`Softmax 把所有分数一起转为正权重，总和为 1。它保留相对大小；即使某个 Key 的分数为负，它也可能得到非零权重。`,`现在用权重对 Value 求加权和。本例故意令 vᵢ 与 kᵢ 数值相同，便于观察；真实 Transformer 的 Key 与 Value 来自不同投影，通常不相同。`][step],result:`权重和 ${fmt(weights.reduce((a,b)=>a+b,0))} · Query ${angle}°`,note:'改变角度会重算所有数值；这是单头、单 Query 的 scaled dot-product attention。'};
  }
  function transformer(step,position) {
    const embeddings=[[1,0,1,0],[0,1,0,1],[1,1,0,0]],selected=position-1,q=embeddings[selected],scores=embeddings.slice(0,position).map(k=>q.reduce((sum,v,i)=>sum+v*k[i],0)/2),weights=softmax(scores),h=[0,1,2,3].map(i=>weights.reduce((sum,a,j)=>sum+a*embeddings[j][i],0)),mlp=h.map(v=>v+Math.max(0,v)*.5),outWeights=[[1,0,-1,.5,0],[0,1,0,-.5,.5],[.5,0,1,0,-.5],[0,.5,0,1,.5]],logits=[0,1,2,3,4].map(i=>mlp.reduce((sum,v,j)=>sum+v*outWeights[j][i],0)),probs=softmax(logits),tokens=['我','喜欢','学习'],vocab=['模型','数学','语言','。','与'];
    let svg=text(28,28,`序列长度 T = 3 · 维度 d = 4 · 观察位置 ${position}`,'v-title');
    const labels=[['Token','[3]'],['Embedding','[3, 4]'],['Causal attention','[3, 4]'],['MLP + residual','[3, 4]'],['Vocab logits','[3, 5]']];
    labels.forEach((n,i)=>{const x=20+i*148;if(i)svg+=arrow(x-16,86,x-4,86);svg+=node(x,53,132,n[0],n[1],i===step);});
    if(step===0){tokens.forEach((token,i)=>{svg+=rect(152+i*165,181,130,70,i===selected?'v-node active':'v-node')+text(217+i*165,211,token,'v-center v-title')+text(217+i*165,238,`ID ${i+1}`,'v-center v-small');});}
    if(step===1){embeddings.forEach((row,i)=>{svg+=text(65,185+i*42,tokens[i],'v-small');row.forEach((v,j)=>svg+=rect(152+j*90,160+i*42,78,33,i===selected?'v-node active':'v-node')+text(191+j*90,182+i*42,v,'v-center v-small'));});}
    if(step===2){for(let r=0;r<3;r++)for(let c=0;c<3;c++){const rowSoft=softmax(embeddings.slice(0,r+1).map(k=>embeddings[r].reduce((sum,v,i)=>sum+v*k[i],0)/2));svg+=rect(175+c*96,155+r*45,86,36,r===selected?'v-node active':'v-node')+text(218+c*96,178+r*45,c>r?'MASK':fmt(rowSoft[c]),'v-center v-small');}svg+=text(510,197,'每一行只看自己及过去','v-small')+text(510,233,'未来 token 权重为 0','v-small');}
    if(step===3){svg+=text(40,175,'所选位置 attention 输出','v-small')+text(40,210,`h = [${h.map(fmt).join(', ')}]`,'v-title')+text(40,250,'简化 MLP：h + 0.5 ReLU(h)','v-small')+text(40,285,`输出 = [${mlp.map(fmt).join(', ')}]`,'v-small');}
    if(step===4){probs.forEach((p,i)=>{const x=75+i*133;svg+=rect(x,285-p*260,65,p*260,'v-fill-teal',2)+text(x+32,307,vocab[i],'v-small v-center')+text(x+32,275-p*260,`${(p*100).toFixed(1)}%`,'v-small v-center');});}
    return {svg,formula:['文本 → token IDs ∈ ℕᵀ','E[token IDs] → X ∈ ℝᵀˣᵈ','A = softmax(QKᵀ / √d + causal mask); H = AV','逐位置 MLP + residual：每个位置保持输出维度 d','logits = H Wᵥₒ꜀ₐᵦ; p(next token) = softmax(logits)'][step],body:[`把文字切成离散 token 后，模型首先看到的是整数编号。本例用“我 / 喜欢 / 学习”作为三个教学 token；真实 tokenizer 的切分由训练出的词表决定。`,`Embedding 是查表：每个 token ID 取出一个长度为 d 的向量。这里表是人为指定的 4 维值，便于跟踪形状；它们不是实际模型的语义嵌入。`,`用 Q = K = V = X 的单头简化计算观察因果掩码。所选第 ${position} 个位置只能关注前 ${position} 个 token；每一行的可见位置权重总和为 1。`,`MLP 对每个位置独立变换特征，残差把输入加回输出。本例特意使用 h + 0.5 ReLU(h) 以得到可复核数字；完整 Transformer 通常有扩展隐藏维度的两层 MLP，还包含归一化、位置编码及注意力残差。`,`将所选位置的 4 维向量通过固定的 4×5 教学投影映射到 5 个候选 token，再计算 Softmax。柱形展示的是下一 token 概率，不是对整句未来的同时预测。`][step],result:`T = 3 · d = 4 · 词表 |V| = 5 · 位置 ${position}`,note:'形状与因果结构是真实机制；权重为确定的玩具参数，省略多头与归一化，不代表一个训练好的模型。'};
  }
  function agent(step,budget) {
    const canRetry=budget>=2;
    const states=['Plan','Tool','Observe','Evaluate','Stop'];
    const active=step===0?0:step===1?1:step===2?2:step===3?3:!canRetry?4:step===4?1:step===5?2:step===6?3:4;
    let svg=text(28,30,'任务：找出指定报告的发布日期，并附来源','v-title');
    states.forEach((s,i)=>{const x=20+i*149;if(i)svg+=arrow(x-17,95,x-5,95);svg+=node(x,62,128,s,['计划','检索工具','读取结果','核验依据','停止'][i],i===active);});
    svg+=`<path d="M 531 133 V 165 H 84 V 133" class="v-loop" marker-end="url(#visual-arrow)"/>`+text(310,158,'证据不足且预算未耗尽 → 再计划','v-small v-center');
    const callCount=step<1?0:step<4||!canRetry?1:2;
    let event='计划：先搜索报告标题，再核验原始来源。';
    if(step===1)event='工具调用 #1：search("报告 发布日期")';
    if(step===2)event='观察 #1：返回二手摘要，缺少可核验日期。';
    if(step===3)event=canRetry?'评估 #1：证据不足，剩余预算允许定位原文。':'评估 #1：证据不足且预算耗尽，必须停止。';
    if(step>=4&&!canRetry)event='停止：无法从现有证据确认日期，明确报告不确定。';
    else if(step===4)event='工具调用 #2：open("原始报告页面")';
    else if(step===5)event='观察 #2：教学页面返回 date = 2024-06-12。';
    else if(step===6)event='评估 #2：字段存在，来源与报告匹配，可给出结论。';
    else if(step===7)event='停止：返回 2024-06-12，并附教学来源标识。';
    svg+=rect(35,190,690,98,'v-node')+text(57,219,event,'v-small')+text(57,256,`工具预算：${callCount} / ${budget} 次 · 当前状态：${states[active]}`,'v-title');
    return {svg,formula:'下一状态 = f(当前状态, 工具观察, 证据是否充分, 剩余预算)',body:`${event} ${step<3?'工具返回的数据进入上下文，但“看到一个结果”并不等于任务已经完成。':'评估节点决定继续还是停止：既要核验目标是否满足，也要遵守工具次数上限。'} 调整预算为 1 或 2，比较系统在证据不足时能否继续检索。`,result:`${states[active]} · 已调用 ${callCount} 次 · 上限 ${budget}`,note:'这是确定性教学模拟：没有联网、没有调用真实模型，报告、日期与检索结果均为虚构示例。'};
  }
  function stop(){ if(timer!==null){clearInterval(timer);timer=null;} if(mounted?.isConnected){const b=mounted.querySelector('[data-visual-action="play"]');if(b){b.textContent='播放步骤';b.setAttribute('aria-pressed','false');}} }
  function mount(){
    stop();
    const host=document.querySelector('.lesson-content');
    const course=window.COURSE;
    const lesson=course?.lessons?.find(item=>item.id===host?.dataset.lessonId);
    const scoped=course?.experimentsMode==='lesson';
    const visualId=scoped?lesson?.visual:course?.id;
    const config=scoped?window.COURSE_VISUALS?.[visualId]:configs[visualId];
    if(!host||!config||host.querySelector('.geometry-lab'))return;
    const el=document.createElement('section');el.className='geometry-lab';el.dataset.visualId=visualId;mounted=el;
    let step=0,value=config.value;
    el.innerHTML=`<div class="geometry-heading"><span class="eyebrow">GEOMETRIC INTUITION / 几何直觉实验</span><h2>${esc(config.title)}</h2><p>先观察，再调整参数，最后把图形对应到公式。</p></div><div class="geometry-canvas"></div><div class="geometry-parameters"><label> ${esc(config.param)} <output>${value}</output><input type="range" min="${config.min}" max="${config.max}" step="${config.step}" value="${value}" aria-label="${esc(config.param)}"></label></div><div class="geometry-controls"><button type="button" data-visual-action="prev">← 上一步</button><button type="button" data-visual-action="play" aria-pressed="false">播放步骤</button><button type="button" data-visual-action="next">下一步 →</button><button type="button" data-visual-action="reset">重置</button><span class="geometry-counter"></span></div><div class="geometry-explanation" aria-live="polite"><h3></h3><div class="geometry-formula"></div><p class="geometry-body"></p><p class="geometry-result"></p></div><p class="geometry-note"></p>`;
    const objective=host.querySelector('.objectives');if(objective)objective.after(el);else host.prepend(el);
    function draw(){const data=config.render(step,value);el.querySelector('.geometry-canvas').innerHTML=`<svg viewBox="0 0 760 330" role="img" aria-label="${esc(config.title+'：'+config.steps[step]+ '。'+data.result)}">${grid}${data.svg}</svg>`;el.querySelector('output').textContent=value;el.querySelector('.geometry-counter').textContent=`${step+1} / ${config.steps.length}`;el.querySelector('.geometry-explanation h3').textContent=config.steps[step];el.querySelector('.geometry-formula').textContent=data.formula;el.querySelector('.geometry-body').textContent=data.body;el.querySelector('.geometry-result').textContent=data.result;el.querySelector('.geometry-note').textContent=data.note;el.querySelector('[data-visual-action="prev"]').disabled=step===0;el.querySelector('[data-visual-action="next"]').disabled=step===config.steps.length-1;}
    el.querySelector('input').addEventListener('input',event=>{stop();value=Number(event.target.value);draw();});
    el.querySelectorAll('[data-visual-action]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.visualAction;if(action==='play'){if(timer){stop();return;}if(step===config.steps.length-1)step=0;draw();button.textContent='暂停';button.setAttribute('aria-pressed','true');timer=setInterval(()=>{if(!el.isConnected||step>=config.steps.length-1){stop();return;}step++;draw();if(step===config.steps.length-1)stop();},window.matchMedia('(prefers-reduced-motion: reduce)').matches?4000:2200);return;}stop();if(action==='prev')step=Math.max(0,step-1);if(action==='next')step=Math.min(config.steps.length-1,step+1);if(action==='reset'){step=0;value=config.value;el.querySelector('input').value=value;}draw();}));
    draw();
  }
  document.addEventListener('course:render',mount);
  window.addEventListener('hashchange',stop);
  window.addEventListener('pagehide',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  mount();
})();
