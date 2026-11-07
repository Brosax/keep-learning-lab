/* CS336 07–12, aligned with the 2026 lectures.
 * 07 code: lecture_07.py · collective_operations() / collective_operations_main() / benchmarking()
 * 08 visual: Lecture 8 (2026) p.33–34 pipeline bubble (n_stages = 4)
 * 09 visual: Lecture 9 (2026) p.48–52 IsoFLOP valley with the fit L = 482/N^0.35 + 2085/D^0.37 + 1.82
 * 10 visual: lecture_10.py · compute_transformer_performance_stats() with llama2_13b_config()
 * 11 and 12 have no module.
 */
(() => {
'use strict';
const {text,line,fmt}=window.MLVis;
const V=window.COURSE_VISUALS ||= {},C=window.COURSE_CODE ||= {};
const title=s=>text(24,28,s,'v-title');
const box=(x,y,w,h,fill,opacity=1)=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" rx="2" fill="${fill}" fill-opacity="${opacity}"/>`;

C['cs336-07']={name:'集体通信：all-reduce = reduce-scatter + all-gather',
 instructions:['先运行默认代码：4 个 rank 的输入是讲义里的 [0,1,2,3] + rank，all-reduce 后每个 rank 都是 [6,10,14,18]；reduce-scatter 后 rank r 只拿到第 r 个和，再 all-gather 回来与 all-reduce 相同。','看 ring 部分：按作业 2 描述的环形算法，每个 rank 在 reduce-scatter 和 all-gather 各发送 W − 1 块，共 2(W − 1) 块，这就是 benchmarking() 里 sent_bytes 的 2 × (world_size − 1)。','把 W 改成 8（rank 输入同样是 [0..W−1] + rank），观察结果和每个 rank 的发送块数怎样变化。'],
 expected:'默认：allReduce 每个 rank = [6,10,14,18]；reduceScatter = [[6],[10],[14],[18]]；allGatherAfterReduceScatter 与 allReduce 相同 = true；allToAll 是转置；ring 每个 rank 发送 6 块；benchmark：size_bytes = 419430400，all-reduce sent_bytes = 2516582400，reduce-scatter sent_bytes = 5033164800。',
 code:`const W = 4;   // world_size
// 讲义 collective_operations_main()：rank r 的数据是 [0, 1, 2, 3] + r
const inputs = Array.from({ length: W }, (_, r) => Array.from({ length: W }, (_, i) => i + r));

// 8 种集体操作（collective_operations()），每个函数接收“每个 rank 一份”的数组，返回每个 rank 的结果
const broadcast = (xs, root = 0) => xs.map(() => xs[root].slice());
const scatter = (xs, root = 0) => xs.map((_, r) => [xs[root][r]]);
const gather = (xs, root = 0) => xs.map((_, r) => (r === root ? xs.map(x => x[0]) : null));
const reduce = (xs, root = 0) => xs.map((_, r) => (r === root ? xs[0].map((_, i) => xs.reduce((s, x) => s + x[i], 0)) : null));
const allGather = xs => xs.map(() => xs.map(x => x[0]));
const reduceScatter = xs => xs.map((_, r) => [xs.reduce((s, x) => s + x[r], 0)]);
const allReduce = xs => xs.map(() => xs[0].map((_, i) => xs.reduce((s, x) => s + x[i], 0)));
const allToAll = xs => xs.map((_, r) => xs.map(x => x[r]));      // rank r 收到每个 rank 的第 r 块

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ar = allReduce(inputs), rs = reduceScatter(inputs), ag = allGather(rs);
console.log({ inputs, allReduce: ar, reduceScatter: rs, allGatherAfterReduceScatter: ag, allReduceEqualsRsThenAg: same(ar, ag),
  broadcast: broadcast(inputs)[3], scatter: scatter(inputs), gather: gather(scatter(inputs))[0], reduce: reduce(inputs)[0],
  allToAll: allToAll(inputs.map((x, r) => x.map((_, i) => r * W + i))) });   // 输入 [0..3],[4..7],…：结果是转置

// 环形实现（作业 2 的描述）：每步 rank i 把一块部分和发给 rank i+1
function ringAllReduce(xs) {
  const buf = xs.map(x => x.slice()), sent = Array(W).fill(0);
  for (let s = 0; s < W - 1; s++) {                    // reduce-scatter 阶段
    const msgs = buf.map((b, i) => { const c = (i - s + W) % W; sent[i]++; return { to: (i + 1) % W, c, v: b[c] }; });
    for (const m of msgs) buf[m.to][m.c] += m.v;
  }
  for (let s = 0; s < W - 1; s++) {                    // all-gather 阶段：传递已经完整的块
    const msgs = buf.map((b, i) => { const c = (i + 1 - s + W) % W; sent[i]++; return { to: (i + 1) % W, c, v: b[c] }; });
    for (const m of msgs) buf[m.to][m.c] = m.v;
  }
  return { result: buf, chunksSentPerRank: sent };
}
const ring = ringAllReduce(inputs);
console.log({ ring: ring.result, ringMatches: same(ring.result, ar), chunksSentPerRank: ring.chunksSentPerRank });

// benchmarking() 的字节账：100 × 1024² 个 float32，world_size = 4
const numElements = 100 * 1024 ** 2, sizeBytes = 4 * numElements;
console.log({ benchmark: { sizeBytes, allReduceSentBytes: sizeBytes * 2 * (W - 1),
  reduceScatterDataBytes: 4 * W * numElements, reduceScatterSentBytes: 4 * W * numElements * (W - 1) } });`};

// Lecture 8 (2026) p.33–34: n_stages = 4 GPipe-style schedule; bubble ratio = (n_stages − 1)/n_micro.
function pipeline(m,p=4){
 const total=2*(m+p-1),cells=[];
 for(let d=0;d<p;d++){
  for(let j=0;j<m;j++)cells.push({d,slot:d+j,kind:'F',micro:j});
  for(let k=0;k<m;k++)cells.push({d,slot:(m+p-1)+(p-1-d)+k,kind:'B',micro:m-1-k});
 }
 return {stages:p,micro:m,totalSlots:total,busySlotsPerDevice:2*m,idleSlotsPerDevice:2*(p-1),bubbleRatio:(p-1)/m,utilization:m/(m+p-1),cells};
}
V['cs336-08']={title:'流水线气泡：微批次越多，空等占比越小',param:'微批次数 n_micro',min:1,max:32,step:1,value:4,
 steps:['层间并行：每台设备放 1/4 的层，依次前向、反向','切成微批次：前向和反向沿设备斜着排开','气泡比 = (n_stages − 1) / n_micro'],
 render(step,m){
  const r=pipeline(m),slotW=640/r.totalSlots,x0=96,y0=70,rowH=46;
  let svg=title('Lecture 8 p.33–34 · pipeline parallelism（4 个 stage）');
  for(let d=0;d<4;d++){
   svg+=text(x0-10,y0+d*rowH+26,`GPU ${d}`,'v-end v-small')+box(x0,y0+d*rowH,640,rowH-8,'#172337');
  }
  const shown=step===0?pipeline(1):r;
  const sw=step===0?640/shown.totalSlots:slotW;
  for(const c of shown.cells){
   const x=x0+c.slot*sw,y=y0+c.d*rowH;
   svg+=`<rect x="${x+.5}" y="${y}" width="${Math.max(0,sw-1)}" height="${rowH-8}" rx="2" fill="${c.kind==='F'?'#7aa2f7':'#50dfc2'}"/>`;
   if(sw>=18)svg+=text(x+sw/2,y+24,`${c.kind}${shown.micro>1?c.micro:''}`,'v-center v-small');
  }
  svg+=line(x0,y0+4*rowH,x0+640,y0+4*rowH,'v-axis')+text(x0+320,y0+4*rowH+18,`时间（共 ${shown.totalSlots} 个时隙，F 与 B 按讲义画成等宽）`,'v-center v-small');
  if(step>=2)svg+=text(736,58,`气泡比 ${fmt(r.bubbleRatio,4)} · 利用率 ${fmt(r.utilization,4)}`,'v-end v-small');
  const bodies=[
   '讲义 p.33：把模型的层切成 4 段放到 4 张卡上（层间并行）。一个批次必须先依次经过 GPU 0→3 的前向，再依次经过 GPU 3→0 的反向，所以任一时刻只有一张卡在工作，每张卡只有 1/4 的时间在算。',
   `p.34 的做法是把批次切成 n_micro = ${m} 个微批次：GPU 0 做完第 1 个微批次的前向就交给 GPU 1，自己马上开始第 2 个。前向和反向因此沿对角线排开，共 ${r.totalSlots} 个时隙；每张卡忙 ${r.busySlotsPerDevice} 个，开头和结尾各空等 ${r.stages-1} 个——这就是气泡（bubble）。`,
   `讲义给出的开销：气泡时间 / 有用计算时间 = (n_stages − 1)/n_micro = 3/${m} = ${fmt(r.bubbleRatio,4)}。补充：换成利用率是 n_micro/(n_micro + n_stages − 1) = ${fmt(r.utilization,4)}。微批次越多气泡占比越小，所以流水线并行需要足够大的批次（讲义：“so we need a big batch size”）。`];
  return {svg,metrics:{stages:r.stages,micro:r.micro,totalSlots:r.totalSlots,busySlotsPerDevice:r.busySlotsPerDevice,idleSlotsPerDevice:r.idleSlotsPerDevice,bubbleRatio:r.bubbleRatio,utilization:r.utilization},
   formula:'气泡开销 = (n_stages − 1) / n_micro；补充：利用率 = n_micro / (n_micro + n_stages − 1)',body:bodies[step],
   result:`n_micro = ${m} · 气泡比 ${fmt(r.bubbleRatio,4)} · 利用率 ${fmt(r.utilization,4)} · 共 ${r.totalSlots} 个时隙`,
   note:'图按讲义 GPipe 示意画：先做完全部前向再做反向，前向和反向画成等宽。实际反向约是前向的 2 倍时间；1F1B、交错（interleaved）和 zero-bubble 等调度（p.35–37）会进一步减小气泡或显存。'};
 }};

// Lecture 9 (2026) p.52: Chinchilla-curve fit L(N, D) = 482/N^0.35 + 2085/D^0.37 + 1.82, with C = 6ND.
const FIT={A:482,alpha:.35,B:2085,beta:.37,E:1.82};
const lossND=(N,D)=>FIT.A/N**FIT.alpha+FIT.B/D**FIT.beta+FIT.E;
function isoflop(logC){
 const Cc=10**logC;let best={N:0,L:Infinity};
 const curve=[];
 for(let i=0;i<=400;i++){const logN=6+i*(10/400),N=10**logN,D=Cc/(6*N),L=lossND(N,D);curve.push([logN,L]);if(L<best.L)best={N,L};}
 // refine the minimum on a fine log grid around the coarse optimum (numerical search, no closed form)
 let lo=Math.log10(best.N)-.05,hi=Math.log10(best.N)+.05;
 for(let it=0;it<80;it++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(lossND(10**a,Cc/(6*10**a))<lossND(10**b,Cc/(6*10**b)))hi=b;else lo=a;}
 const Nopt=10**((lo+hi)/2),Dopt=Cc/(6*Nopt);
 return {logC,C:Cc,Nopt,Dopt,tokensPerParam:Dopt/Nopt,Lopt:lossND(Nopt,Dopt),lossAtTenthN:lossND(Nopt/10,Cc/(6*Nopt/10)),lossAtTenTimesN:lossND(Nopt*10,Cc/(60*Nopt)),curve};
}
V['cs336-09']={title:'IsoFLOP 山谷：固定算力下最优的模型大小',param:'log₁₀ C（训练 FLOPs）',min:19,max:24,step:.5,value:21,
 steps:['固定算力 C，沿 D = C/(6N) 扫描模型大小 N','山谷的谷底：N_opt 与 D_opt','把各预算的谷底连起来：N_opt ∝ C^0.51'],
 render(step,logC){
  const r=isoflop(logC),X=logN=>80+(logN-6)/10*640,Y=L=>300-(Math.min(L,4)-1.8)/2.2*230;
  let svg=title('Lecture 9 p.48–52 · IsoFLOP profile（拟合式来自 p.52）');
  svg+=line(80,300,720,300,'v-axis')+line(80,70,80,300,'v-axis')+text(716,292,'模型参数 N（对数轴）','v-end v-small')+text(14,180,'Loss','v-small');
  for(let e=6;e<=16;e+=2)svg+=line(X(e),300,X(e),305,'v-axis')+text(X(e),318,`1e${e}`,'v-center v-small');
  [2,2.5,3,3.5,4].forEach(L=>{svg+=text(74,Y(L)+4,String(L),'v-end v-small');});
  if(step>=2)for(let c=19;c<=24;c+=1){const o=isoflop(c),pts=o.curve.filter(([,L])=>L<4).map(([n,L])=>`${X(n).toFixed(1)},${Y(L).toFixed(1)}`).join(' ');svg+=`<polyline points="${pts}" fill="none" stroke="#53657d" stroke-width="1"/>`+`<circle cx="${X(Math.log10(o.Nopt))}" cy="${Y(o.Lopt)}" r="3" fill="#9aa9bd"/>`;}
  const pts=r.curve.filter(([,L])=>L<4).map(([n,L])=>`${X(n).toFixed(1)},${Y(L).toFixed(1)}`).join(' ');
  svg+=`<polyline points="${pts}" class="v-teal"/>`;
  if(step>=1){const x=X(Math.log10(r.Nopt)),y=Y(r.Lopt);svg+=`<circle cx="${x}" cy="${y}" r="6" class="v-dot"/>`+line(x,y,x,300,'v-loop')+text(x,y-12,`N_opt ≈ ${r.Nopt.toExponential(2)}`,'v-center v-small');}
  svg+=text(716,56,`C = 1e${fmt(logC,1)} FLOPs`,'v-end v-small');
  const bodies=[
   `IsoFLOP（p.48）：先固定训练算力 C = 10^${fmt(logC,1)}，再训练一系列不同大小的模型。因为 C ≈ 6ND，模型越大，能看的 token D = C/(6N) 越少。把 p.52 的拟合 L = 482/N^0.35 + 2085/D^0.37 + 1.82 沿这条约束画出来，就得到一条山谷形的曲线：太小的模型能力不够，太大的模型数据不够。`,
   `谷底给出这个预算下的最优分配：N_opt ≈ ${r.Nopt.toExponential(3)}，D_opt ≈ ${r.Dopt.toExponential(3)}，每个参数约 ${fmt(r.tokensPerParam,1)} 个 token，最低损失 ${fmt(r.Lopt,4)}。补充：把 N 缩小到 1/10 或放大 10 倍，损失分别升到 ${fmt(r.lossAtTenthN,4)} 和 ${fmt(r.lossAtTenTimesN,4)}，谷底附近相当平坦。`,
   `灰线是 C = 1e19 到 1e24 的山谷。把每个预算的谷底连起来，在对数坐标里是一条直线（p.49 右图）；用这个拟合式，斜率是 β/(α+β) = 0.37/0.72 ≈ 0.51，与 p.52 所说 Chinchilla 式计数下的 0.51（接近 Chinchilla 的 0.50）一致。拖动滑块：每多 1 个数量级的算力，N_opt 约增大 10^0.51 ≈ 3.3 倍。`];
  return {svg,metrics:{logC:r.logC,C:r.C,Nopt:r.Nopt,Dopt:r.Dopt,tokensPerParam:r.tokensPerParam,Lopt:r.Lopt,lossAtTenthN:r.lossAtTenthN,lossAtTenTimesN:r.lossAtTenTimesN},
   formula:'L(N, D) = 482/N^0.35 + 2085/D^0.37 + 1.82；约束 D = C/(6N)；N_opt ∝ C^{β/(α+β)} = C^0.51',body:bodies[step],
   result:`C = 1e${fmt(logC,1)} · N_opt ≈ ${r.Nopt.toExponential(3)} · D_opt ≈ ${r.Dopt.toExponential(3)} · D/N ≈ ${fmt(r.tokensPerParam,1)} · L ≈ ${fmt(r.Lopt,4)}`,
   note:'谷底用数值搜索求得。拟合式来自讲义 p.52 引用的 Pearce & Song 的设定；不同拟合（例如 Chinchilla 方法 3 的原始系数）给出的 D/N 不同，讲义 p.53 也讨论了方法 3 的误差。这里的 D/N 约 15–21，不要当成“20 个 token/参数”的精确依据。'};
 }};

// lecture_10.py: llama2_13b_config(); memory = B·S·K·H·L·2·2 + 2·params; latency = memory / 3.35e12; throughput = B / latency.
const L2={V:32000,D:5120,F:13824,N:40,H:128,L:40,S:1024,bw:3.35e12};
function inferenceStats(B,K){
 const p=L2,numParams=2*p.V*p.D+3*p.D*p.F*p.L+(2*p.D*p.N*p.H+2*p.D*K*p.H)*p.L,paramBytes=2*numParams,kvPerSeq=p.S*K*p.H*p.L*2*2;
 const memory=B*kvPerSeq+paramBytes,latency=memory/p.bw,throughput=B/latency;
 return {B,K,numParams,paramBytes,kvPerSeq,memory,memoryGB:memory/1e9,latencyMs:latency*1e3,throughput,fits:memory<=80e9,maxBatchThatFits:Math.floor((80e9-paramBytes)/kvPerSeq)};
}
V['cs336-10']={title:'Llama 2 13B 解码：batch 越大，吞吐越高、延迟越长',param:'batch size B',min:1,max:256,step:1,value:64,
 steps:['MHA：K = N = 40 个 KV 头','GQA：K = 8 个 KV 头'],
 render(step,B){
  const K=step===0?40:8,m=inferenceStats(B,K),other=inferenceStats(B,step===0?8:40);
  let svg=title(`lecture_10 · llama2_13b_config()，S = 1024，K = ${K}`);
  const scale=600/250e9,x0=110;
  const bar=(y,s,label)=>{let out=text(x0-10,y+22,label,'v-end v-small')+box(x0,y,Math.min(600,s.paramBytes*scale),32,'#7aa2f7',.8)+box(x0+s.paramBytes*scale,y,Math.min(600-s.paramBytes*scale,B*s.kvPerSeq*scale),32,'#f2b46d',.85);if(s.memory*scale>600)out+=text(x0+604,y+22,'→','v-small');return out+text(x0+4,y+50,`${fmt(s.memoryGB,2)} GB · ${fmt(s.latencyMs,2)} ms/token · ${fmt(s.throughput,0)} token/s${s.fits?'':' · 放不下'}`,'v-small');};
  svg+=bar(80,m,`K = ${K}`)+bar(170,other,`K = ${other.K}`);
  const x80=x0+80e9*scale;svg+=line(x80,66,x80,262,'v-loop')+text(x80,60,'H100 80 GB','v-center v-small');
  svg+=box(x0,282,14,12,'#7aa2f7',.8)+text(x0+20,293,'参数（bf16）','v-small')+box(x0+130,282,14,12,'#f2b46d',.85)+text(x0+150,293,'KV 缓存（B 条序列）','v-small');
  svg+=text(740,318,`K = ${K} 时最多放得下 B = ${m.maxBatchThatFits}`,'v-end v-small');
  const bodies=[
   `讲义用 sympy 写出 Llama 2 13B 的账本：参数 ${(m.numParams/1e9).toFixed(3)}B，bf16 占 ${fmt(m.paramBytes/1e9,2)} GB；每条序列的 KV 缓存 = S·K·H·L·2·2 = ${fmt(m.kvPerSeq/1e6,1)} MB（K 和 V 两份、bf16 两字节）。解码每一步都要把参数和全部 KV 缓存从 HBM 读一遍，所以延迟 = 内存 / 3.35 TB/s，吞吐 = B / 延迟。当前 B = ${B}：${fmt(m.memoryGB,2)} GB，${fmt(m.latencyMs,2)} ms/token，${fmt(m.throughput,0)} token/s${m.fits?'':'，超过 80 GB 放不下'}。`,
   `reduce_kv_cache_size() 的 GQA：KV 头从 40 减到 8，每条序列的 KV 缓存缩小 5 倍，变成 ${fmt(m.kvPerSeq/1e6,1)} MB，参数也略少。同样 B = ${B} 时只需 ${fmt(m.memoryGB,2)} GB、${fmt(m.latencyMs,2)} ms/token、${fmt(m.throughput,0)} token/s；最大可放下的 batch 从 ${other.maxBatchThatFits} 增到 ${m.maxBatchThatFits}。拖动 B：延迟和吞吐都随 B 上升，但参数读取被更多序列分摊后，吞吐的增长越来越慢。`];
  return {svg,metrics:m,formula:'memory = B · S·K·H·L·2·2 + 2 · num_params；latency = memory / 3.35e12；throughput = B / latency',body:bodies[step],
   result:`K = ${K}, B = ${B} · ${fmt(m.memoryGB,2)} GB · ${fmt(m.latencyMs,2)} ms/token · ${fmt(m.throughput,0)} token/s`,
   note:'这是讲义的简化模型：只计参数和 KV 缓存的读取，忽略激活和计算时间，GB 按 10⁹ 字节。讲义只说了 K = 40、B = 256 放不下；K = 40、B = 64 的 79.72 GB 刚好低于 80 GB，是这里补充计算的结果。'};
 }};
})();
