/* CS336 01–06, aligned with the 2026 lectures.
 * 01 code: lecture_01.py · train_bpe() / count_adjacent_pairs() / merge() / BPETokenizer
 * 02 visual: lecture_02.py · arithmetic_intensity_matmul() / roofline_plots()
 * 03 code: Lecture 3 (2026) p.31–35 RoPE relative-position property (Assignment 1 · Problem (rope))
 * 04 code: Lecture 4 (2026) p.4–5 linear attention as matrix reordering and as an RNN
 * 05 visual: Lecture 5 (2026) p.48 wave quantization
 * 06 code: lecture_06.py · matmul_relu_kernel() block decomposition
 */
(() => {
'use strict';
const {text,line,fmt}=window.MLVis;
const V=window.COURSE_VISUALS ||= {},C=window.COURSE_CODE ||= {};
const title=s=>text(24,28,s,'v-title');
const box=(x,y,w,h,fill,opacity=1)=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" rx="2" fill="${fill}" fill-opacity="${opacity}"/>`;

C['cs336-01']={name:'train_bpe：在 "the cat in the hat" 上合并 3 次',
 instructions:['先运行默认代码：3 次合并依次得到 256 = "th"、257 = "the"、258 = "the "，训练串从 18 个索引缩到 12 个，压缩率 1.5。','把 numMerges 改成 4：第 4 次合并的是 (a, t) → "at"，训练串只剩 10 个索引；再改成 0，看看什么都不合并时编码就是原始 UTF-8 字节。','把 testString 换成包含中文或 emoji 的句子：每个字符会先变成 3–4 个字节，训练语料里没出现过的字节对不会被合并，但 decode(encode(s)) 仍然还原原文。'],
 expected:'默认：merges = [[116,104]→256 "th", [256,101]→257 "the", [257,32]→258 "the "]；训练串长度 18→16→14→12，compression_ratio = 1.5；"the quick brown fox" 19 字节编码成 16 个 token，压缩率 1.1875，roundTrip = true。',
 code:`const trainString = "the cat in the hat";
const numMerges = 3;
const testString = "the quick brown fox";

// 沙箱里没有 TextEncoder，这里手写 UTF-8 编码（等价于 Python 的 string.encode("utf-8")）
function utf8(s) {
  const out = [];
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}
function utf8Decode(bytes) {
  let s = "", i = 0;
  while (i < bytes.length) {
    const b = bytes[i], n = b < 0x80 ? 1 : b < 0xe0 ? 2 : b < 0xf0 ? 3 : 4;
    let c = n === 1 ? b : b & (0xff >> (n + 1));
    for (let j = 1; j < n; j++) c = (c << 6) | (bytes[i + j] & 63);
    s += String.fromCodePoint(c); i += n;
  }
  return s;
}

// count_adjacent_pairs()：Map 按插入顺序保存，重叠出现也计数
function countAdjacentPairs(indices) {
  const counts = new Map();
  for (let i = 0; i + 1 < indices.length; i++) {
    const key = indices[i] + "," + indices[i + 1];
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}
// merge()：从左到右扫描，匹配就写入 newIndex 并跳过两个位置
function merge(indices, pair, newIndex) {
  const out = [];
  let i = 0;
  while (i < indices.length) {
    if (i + 1 < indices.length && indices[i] === pair[0] && indices[i + 1] === pair[1]) { out.push(newIndex); i += 2; }
    else { out.push(indices[i]); i += 1; }
  }
  return out;
}

// train_bpe()
let indices = utf8(trainString);
const vocab = new Map(Array.from({ length: 256 }, (_, x) => [x, [x]]));
const merges = [];
const lengths = [indices.length];
for (let i = 0; i < numMerges; i++) {
  const counts = countAdjacentPairs(indices);
  let best = null, bestCount = 0;
  for (const [key, c] of counts) if (c > bestCount) { best = key; bestCount = c; } // 并列时取最先出现的，同 Python max()
  const pair = best.split(",").map(Number);
  const newIndex = 256 + i;
  vocab.set(newIndex, vocab.get(pair[0]).concat(vocab.get(pair[1])));
  merges.push({ pair, newIndex, count: bestCount, bytes: utf8Decode(vocab.get(newIndex)) });
  indices = merge(indices, pair, newIndex);
  lengths.push(indices.length);
}

// BPETokenizer.encode / decode：按训练时的顺序逐条应用合并规则
function encode(s) { let ids = utf8(s); for (const m of merges) ids = merge(ids, m.pair, m.newIndex); return ids; }
function decode(ids) { return utf8Decode(ids.flatMap(id => vocab.get(id))); }

const testIds = encode(testString);
console.log({ merges, lengths, trainIndices: indices, compressionRatio: utf8(trainString).length / indices.length });
console.log({ testBytes: utf8(testString).length, testIds, testTokens: testIds.length,
  testCompression: utf8(testString).length / testIds.length, roundTrip: decode(testIds) === testString });`};

// lecture_02.py: H100 bf16 989.5e12 FLOP/s (1979e12/2), 3.35e12 bytes/s; n×n matmul reads x, w and writes y in bf16.
const H100_FLOPS=1979e12/2,H100_BW=3.35e12,ACC=H100_FLOPS/H100_BW;
function matmulIntensity(n){
 const bytes=6*n*n,flops=n*n*(2*n-1),ai=flops/bytes;
 const commTime=bytes/H100_BW,compTime=flops/H100_FLOPS;
 return {n,bytes,flops,arithmeticIntensity:ai,acceleratorIntensity:ACC,mfuBound:Math.min(1,ai/ACC),communicationTime:commTime,computationTime:compTime,totalTime:Math.max(commTime,compTime),computeBound:ai>ACC};
}
V['cs336-02']={title:'矩阵乘法的算术强度：多大的矩阵才 compute-bound',param:'矩阵边长 n',min:64,max:4096,step:1,value:1024,
 steps:['搬运：读 x、读 w、写 y，共 6n² 字节','计算：n² 个点积，共 n²(2n − 1) 次 FLOP','算术强度对比 H100 的加速器强度 295.37','roofline：MFU = min(1, 算术强度 / 加速器强度)'],
 render(step,n){
  const m=matmulIntensity(n);
  const X=v=>90+(Math.log10(v)+1)/5*620,Y=v=>300-(Math.log10(v)-11)/4.5*240; // x: 0.1–10⁴ FLOP/byte; y: 10¹¹–10¹⁵·⁵ FLOP/s
  let svg=title('lecture_02 · arithmetic_intensity_matmul() 与 roofline_plots()');
  svg+=line(90,300,710,300,'v-axis')+line(90,60,90,300,'v-axis')+text(706,292,'算术强度（FLOP/byte，对数轴）','v-end v-small')+text(14,180,'FLOP/s','v-small');
  [0.1,1,10,100,1000,10000].forEach(v=>{svg+=line(X(v),300,X(v),305,'v-axis')+text(X(v),318,String(v),'v-center v-small');});
  if(step>=2){
   const kneeX=X(ACC),roofY=Y(H100_FLOPS);
   svg+=`<polyline points="${X(0.1)},${Y(0.1*H100_BW)} ${kneeX},${roofY} ${X(10000)},${roofY}" class="v-teal"/>`;
   svg+=line(kneeX,roofY,kneeX,300,'v-loop')+text(kneeX+6,roofY+18,`加速器强度 ${fmt(ACC,2)}`,'v-small')+text(X(3000),roofY-8,'989.5 TFLOP/s','v-center v-small');
   [['ReLU',0.25],['GELU',5],['点积',(2*1024*1024-1)/(4*1024*1024+2)],['矩阵×向量',1024*(2*1024-1)/(2*1024+2*1024*1024+2*1024)]].forEach(([label,ai],i)=>{const y=Y(Math.min(H100_FLOPS,ai*H100_BW));svg+=`<circle cx="${X(ai)}" cy="${y}" r="4" fill="#9aa9bd"/>`+text(X(ai)+(i===2?-6:6),y+(i%2?16:-8),label,i===2?'v-end v-small':'v-small');});
  }
  const ai=m.arithmeticIntensity,px=X(Math.min(10000,ai)),py=Y(Math.min(H100_FLOPS,ai*H100_BW));
  if(step>=1)svg+=`<circle cx="${px}" cy="${py}" r="7" fill="${m.computeBound?'#50dfc2':'#f28b82'}" stroke="#0d1420" stroke-width="2"/>`+text(px,py-14,`n = ${n}`,'v-center v-small');
  svg+=text(740,56,`字节 6n² = ${m.bytes.toExponential(3)}`,'v-end v-small');
  if(step>=1)svg+=text(740,76,`FLOPs = ${m.flops.toExponential(3)}`,'v-end v-small');
  if(step>=2)svg+=text(740,96,`算术强度 = ${fmt(ai,2)} → ${m.computeBound?'compute-bound':'memory-bound'}`,'v-end v-small');
  if(step>=3)svg+=text(740,116,`MFU 上限 = ${fmt(m.mfuBound,4)}`,'v-end v-small');
  const bodies=[
   `讲义把一次运算拆成三步：把输入从显存送到加速器、计算、把输出送回显存。n×n 的 bf16 矩阵每个元素 2 字节，读 x、读 w、写 y 各 2n² 字节，共 6n² = ${m.bytes.toExponential(3)} 字节。按 H100 的 3.35e12 字节/s，搬运需要 ${fmt(m.communicationTime*1e6,2)} μs。`,
   `输出有 n² 个元素，每个是长度 n 的点积：n 次乘法、n − 1 次加法，共 n²(2n − 1) = ${m.flops.toExponential(3)} 次 FLOP。按 H100 去掉稀疏性后的 989.5 TFLOP/s，计算需要 ${fmt(m.computationTime*1e6,2)} μs。讲义假设搬运和计算可以完全重叠，总时间取两者的较大值。`,
   `算术强度 = FLOPs / 字节 = (2n − 1)/6 ≈ n/3，当前为 ${fmt(ai,2)}；H100 的加速器强度 = 989.5e12 / 3.35e12 = ${fmt(ACC,2)}。算术强度更小就是 memory-bound，更大就是 compute-bound。图上灰点是讲义前面算过的 ReLU（0.25）、GELU（5）、点积（≈0.5）、矩阵×向量（≈1），全都 memory-bound。`,
   `roofline 的折点就是加速器强度：左边斜线受带宽限制，右边平台受算力限制。MFU = min(1, ${fmt(ai,2)} / ${fmt(ACC,2)}) = ${fmt(m.mfuBound,4)}。n 从 886 增加到 887 时越过折点；讲义的结论是“只要矩阵够大就是 compute-bound”，而推理时常见的矩阵×向量则是 memory-bound。`];
  return {svg,metrics:m,formula:'bytes = 6n²；FLOPs = n²(2n − 1)；算术强度 = FLOPs / bytes；加速器强度 = 989.5e12 / 3.35e12 ≈ 295.37；MFU = min(1, 算术强度 / 加速器强度)',body:bodies[step],
   result:`n = ${n} · 算术强度 ${fmt(ai,2)} · ${m.computeBound?'compute-bound':'memory-bound'} · MFU 上限 ${fmt(m.mfuBound,4)}`,
   note:'这是讲义的理想模型：不计 kernel 启动、缓存复用和分块细节；真实 MFU 还会更低。精度从 bf16 换成 fp32 时字节数翻倍，算术强度也会变（讲义最后一句提醒）。'};
 }};

C['cs336-03']={name:'RoPE：旋转后的内积只依赖相对位置 m − n',
 instructions:['先运行默认代码：(m, n) = (0, 1)、(2, 3)、(10, 11) 三对相对距离都是 1，RoPE 内积完全相同（−0.904686）；(0, 3) 距离为 3，结果不同。','对照第二行的加法式正弦位置编码：同样相对距离为 1，内积随绝对位置变化（4.218834、1.526809、0.198712）。','把 theta 的计算改成 Math.pow(base, -(2 * k) / d) 以外的写法（例如忘了除以 d），再看 rotationPreservesNorm 和相对位置性质是否仍然成立。'],
 expected:'默认：rope.sameOffset = [−0.904686, −0.904686, −0.904686]，rope.offset3 = −1.336566；additive.sameOffset ≈ [4.218834, 1.526809, 0.198712]；relativeOnly = true，rotationPreservesNorm = true。',
 code:`// 讲义 p.31–35：RoPE 让 <f(x, m), f(y, n)> = g(x, y, m − n)
const d = 4, base = 10000;
const q = [1.0, 0.5, -0.3, 0.8];   // 补充的玩具向量：“we” 的 query
const k = [0.2, 1.0, 0.7, -0.4];   // 补充的玩具向量：“know” 的 key
// 作业 1 的记号：θ_k = Θ^{−(2k−2)/d}，k = 1..d/2；这里用 0 起的下标 k，等价于 Θ^{−2k/d}
const theta = Array.from({ length: d / 2 }, (_, k) => Math.pow(base, -(2 * k) / d));

function rope(x, pos) {             // 每两维一组，按 pos·θ_k 旋转
  const y = x.slice();
  for (let k = 0; k < d / 2; k++) {
    const a = x[2 * k], b = x[2 * k + 1], c = Math.cos(pos * theta[k]), s = Math.sin(pos * theta[k]);
    y[2 * k] = a * c - b * s;
    y[2 * k + 1] = a * s + b * c;
  }
  return y;
}
function sinusoidal(pos) {          // 原始 Transformer 的加法式位置编码
  return Array.from({ length: d }, (_, j) => {
    const i = Math.floor(j / 2), angle = pos / Math.pow(base, (2 * i) / d);
    return j % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  });
}
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const add = (a, b) => a.map((v, i) => v + b[i]);
const r6 = x => Math.round(x * 1e6) / 1e6;

const pairs = [[0, 1], [2, 3], [10, 11]];
const ropeSame = pairs.map(([m, n]) => r6(dot(rope(q, m), rope(k, n))));
const additiveSame = pairs.map(([m, n]) => r6(dot(add(q, sinusoidal(m)), add(k, sinusoidal(n)))));
console.log({
  theta,
  rope: { sameOffset: ropeSame, offset3: r6(dot(rope(q, 0), rope(k, 3))) },
  additive: { sameOffset: additiveSame, offset3: r6(dot(add(q, sinusoidal(0)), add(k, sinusoidal(3)))) },
  relativeOnly: ropeSame.every(v => Math.abs(v - ropeSame[0]) < 1e-9),
  rotationPreservesNorm: Math.abs(Math.hypot(...rope(q, 2)) - Math.hypot(...q)) < 1e-12
});`};

C['cs336-04']={name:'线性注意力：同一个计算的并行形式与 RNN 形式',
 instructions:['先运行默认代码：去掉 softmax 后，(QKᵀ)V 和 Q(KᵀV) 结果相同，这是矩阵乘法结合律（讲义 p.4）。','再看 causal 部分：并行形式加上下三角掩码 M 后，和逐步更新状态 S_t = S_{t−1} + k_t v_tᵀ 的 RNN 形式完全一致（p.5）；不加掩码时只有最后一行相同。','把 gamma 从 0.5 改成 1：衰减版退化成普通线性注意力；改成 0.9 看看早期 token 的贡献怎样被逐步“遗忘”。'],
 expected:'默认：unmasked = reordered = [[8,3],[1,2],[9,5],[7,1]]；causalParallel = recurrent = [[1,0],[1,2],[3,3],[7,1]]，finalState = [[8,3],[1,2]]；decayParallel = decayRecurrent = [[1,0],[0.5,2],[1.5,2],[6.5,2]]；乘法次数 64 对 32。',
 code:`// 补充的小例子：n = 4 个 token，d_k = d_v = 2（讲义 p.4–5 只有符号）
const Q = [[1, 0], [0, 1], [1, 1], [1, -1]];
const K = [[1, 1], [0, 1], [1, 0], [2, 0]];
const V = [[1, 0], [0, 2], [1, 1], [3, 1]];
const gamma = 0.5;                 // RetNet 式衰减（p.5 脚注）

const T = A => A[0].map((_, j) => A.map(row => row[j]));
const matmul = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((s, v, t) => s + v * B[t][j], 0)));
const n = Q.length, dk = K[0].length, dv = V[0].length;

// ① 去掉 softmax 后：(QKᵀ)V = Q(KᵀV)
const unmasked = matmul(matmul(Q, T(K)), V);
const reordered = matmul(Q, matmul(T(K), V));

// ② 自回归要因果掩码：((QKᵀ) ⊙ M)V，M 为下三角（这里用 D_ts = w^{t−s} 统一写，w = 1 即普通掩码）
function maskedParallel(w) {
  const scores = matmul(Q, T(K)).map((row, t) => row.map((v, s) => (s <= t ? v * Math.pow(w, t - s) : 0)));
  return matmul(scores, V);
}
// ③ RNN 形式：S_t = w·S_{t−1} + k_t v_tᵀ，y_t = q_tᵀ S_t
function recurrent(w) {
  let S = Array.from({ length: dk }, () => Array(dv).fill(0));
  const Y = [];
  for (let t = 0; t < n; t++) {
    S = S.map((row, i) => row.map((v, j) => w * v + K[t][i] * V[t][j]));
    Y.push(V[0].map((_, j) => Q[t].reduce((s, q, i) => s + q * S[i][j], 0)));
  }
  return { Y, S };
}
const rnn = recurrent(1), decay = recurrent(gamma);
const same = (A, B) => A.every((row, i) => row.every((v, j) => Math.abs(v - B[i][j]) < 1e-12));
console.log({ unmasked, reordered, associativity: same(unmasked, reordered) });
console.log({ causalParallel: maskedParallel(1), recurrent: rnn.Y, finalState: rnn.S, causalMatches: same(maskedParallel(1), rnn.Y),
  unmaskedRowsMatchingRnn: unmasked.map((row, t) => same([row], [rnn.Y[t]])) });
console.log({ decayParallel: maskedParallel(gamma), decayRecurrent: decay.Y, decayMatches: same(maskedParallel(gamma), decay.Y),
  mulsQuadratic: n * n * dk + n * n * dv, mulsLinear: 2 * n * dk * dv });`};

// Lecture 5 (2026) p.48: tile 256×128 on an A100 with 108 SMs; tiles = ⌈N/256⌉·⌈N/128⌉, waves = ⌈tiles/108⌉.
function waves(N){
 const rows=Math.ceil(N/256),cols=Math.ceil(N/128),tiles=rows*cols,SM=108,w=Math.ceil(tiles/SM),last=tiles-(w-1)*SM;
 return {N,rows,cols,tiles,sms:SM,waves:w,lastWaveTiles:last,utilization:tiles/(w*SM),usefulArea:N*N/(tiles*256*128)};
}
V['cs336-05']={title:'波量化：tile 数越过 108 个 SM 时吞吐骤降',param:'方阵边长 N',min:1536,max:2560,step:1,value:1792,
 steps:['把 N×N 输出切成 256×128 的 tile','每个 SM 一次处理一个 tile：分成若干“波”','最后一波空出多少 SM'],
 render(step,N){
  const m=waves(N);let svg=title('Lecture 5 p.48 · wave quantization（A100：108 个 SM）');
  // left: output matrix tiled
  const size=230,sc=size/2560,x0=30,y0=60;
  svg+=box(x0,y0,size,size,'#172337');
  const cellW=128*sc,cellH=256*sc;
  for(let r=0;r<m.rows;r++)for(let c=0;c<m.cols;c++)svg+=`<rect x="${x0+c*cellW}" y="${y0+r*cellH}" width="${cellW}" height="${cellH}" fill="${step>=1&&r*m.cols+c>=108?'#f2b46d':'#7aa2f7'}" fill-opacity=".55" stroke="#0d1420" stroke-width=".6"/>`;
  svg+=`<rect x="${x0}" y="${y0}" width="${N*sc}" height="${N*sc}" fill="none" stroke="#ffe38a" stroke-width="1.6"/>`;
  svg+=text(x0,y0+size+20,`${m.rows} × ${m.cols} = ${m.tiles} 个 tile`,'v-small');
  if(step>=1){
   const gx=310,gy=60,cw=22,ch=14;
   for(let w=0;w<m.waves;w++){
    svg+=text(gx-8,gy+w*140+12,`第 ${w+1} 波`,'v-end v-small');
    for(let s=0;s<108;s++){const idx=w*108+s,busy=idx<m.tiles,col=s%18,row=Math.floor(s/18);
     svg+=`<rect x="${gx+col*cw}" y="${gy+w*140+row*(ch+4)}" width="${cw-3}" height="${ch}" rx="2" fill="${busy?(w===0?'#7aa2f7':'#f2b46d'):'#2a3647'}"/>`;}
   }
  }
  if(step>=2)svg+=text(740,320,`SM 利用率 ${fmt(m.utilization*100,1)}%（${m.waves} 波，最后一波 ${m.lastWaveTiles}/108）`,'v-end v-small');
  const bodies=[
   `讲义 p.48 用一个简化模型解释 p.20 吞吐曲线上周期性的下跌：输出矩阵被切成 256×128 的 tile。N = ${N} 时需要 ⌈N/256⌉ × ⌈N/128⌉ = ${m.rows} × ${m.cols} = ${m.tiles} 个 tile；黄框是真实的 N×N，超出黄框的部分是边缘 tile 里的无效区域（有效面积占 ${fmt(m.usefulArea*100,1)}%）。`,
   `每个 SM 一次处理一个 tile，A100 有 108 个 SM，所以 ${m.tiles} 个 tile 要分 ⌈${m.tiles}/108⌉ = ${m.waves} 波执行。讲义的例子：N = 1792 时 7 × 14 = 98 个 tile，一波就做完；N = 1793 时变成 8 × 15 = 120 个 tile，第二波只有 12 个 tile 在跑。`,
   `利用率 = tile 数 / (波数 × 108) = ${m.tiles}/(${m.waves} × 108) = ${fmt(m.utilization*100,1)}%。最后一波的空闲 SM 就是吞吐下跌的原因。讲义的建议：让矩阵尺寸（以及 tile 数）与硬件对齐，比如把词表从 50257 补到 64 的倍数 50304。`];
  return {svg,metrics:m,formula:'tiles = ⌈N/256⌉ · ⌈N/128⌉；waves = ⌈tiles / 108⌉；SM 利用率 = tiles / (waves · 108)',body:bodies[step],
   result:`N = ${N} · ${m.tiles} 个 tile · ${m.waves} 波 · SM 利用率 ${fmt(m.utilization*100,1)}%`,
   note:'这是讲义的简化模型：固定 256×128 的 tile、每个 SM 同时只跑一个 tile。真实库会按形状换 tile 尺寸和调度方式，所以 p.20 的实测曲线并不是在每个 108 的倍数处都下跌。'};
 }};

C['cs336-06']={name:'matmul_relu_kernel：按输出 tile 分块，沿 K 方向循环',
 instructions:['先运行默认代码：第 1 部分按讲义的配置（1024³，BLOCK 64/64/32）数出 grid 为 16×16、每个程序循环 32 次，分块后从全局内存读取的元素数比逐元素点积少 64 倍。','第 2 部分故意用不能整除的 5×7 和 7×6 矩阵：maxAbsDiff = 0，说明 mask 把越界位置补成了 0。','把 loadA 里的 k0 + kk < K 条件删掉（只保留行条件），再运行：越界读到 undefined 会让结果出错或变成 NaN，这正是讲义里 mask 的作用。'],
 expected:'默认：part1 = {grid:[16,16], programs:256, iterationsPerProgram:32, tiledLoads:33554432, naiveLoads:2147483648, reuse:64}；part2：grid [3,3]，每程序 2 次迭代，maskedSlots = 57，maxAbsDiff = 0，第一行结果 [91,70,49,28,7,0]。',
 code:`const cdiv = (a, b) => Math.ceil(a / b);

// 第 1 部分：讲义 matmul_relu_main() 的配置，只数读取次数
{
  const M = 1024, N = 1024, K = 1024, BLOCK_M = 64, BLOCK_N = 64, BLOCK_K = 32;
  const grid = [cdiv(M, BLOCK_M), cdiv(N, BLOCK_N)];
  const iterations = cdiv(K, BLOCK_K);
  const loadsPerIteration = BLOCK_M * BLOCK_K + BLOCK_K * BLOCK_N;   // 一块 a、一块 b
  const tiledLoads = grid[0] * grid[1] * iterations * loadsPerIteration;
  const naiveLoads = M * N * K * 2;                                   // 每个输出单独做点积：每步读 a、b 各一个
  console.log({ part1: { grid, programs: grid[0] * grid[1], iterationsPerProgram: iterations, tiledLoads, naiveLoads, reuse: naiveLoads / tiledLoads } });
}

// 第 2 部分（补充）：尺寸不能整除时，mask 保证结果正确
const M = 5, N = 6, K = 7, BLOCK_M = 2, BLOCK_N = 2, BLOCK_K = 4;
const A = Array.from({ length: M }, (_, i) => Array.from({ length: K }, (_, k) => i + k));
const B = Array.from({ length: K }, (_, k) => Array.from({ length: N }, (_, j) => k - j));
const C = Array.from({ length: M }, () => Array(N).fill(0));
let maskedSlots = 0, iterationsTotal = 0;
const loadA = (i, k0, kk) => (i < M && k0 + kk < K ? A[i][k0 + kk] : (maskedSlots++, 0));   // tl.load(..., mask, other=0)
const loadB = (k0, kk, j) => (k0 + kk < K && j < N ? B[k0 + kk][j] : (maskedSlots++, 0));

for (let pidM = 0; pidM < cdiv(M, BLOCK_M); pidM++) {
  for (let pidN = 0; pidN < cdiv(N, BLOCK_N); pidN++) {          // 每个 (pid_m, pid_n) 是一个程序
    const acc = Array.from({ length: BLOCK_M }, () => Array(BLOCK_N).fill(0));
    for (let k0 = 0; k0 < K; k0 += BLOCK_K) {                      // 指针沿 K 前移 BLOCK_K
      iterationsTotal++;
      const a = Array.from({ length: BLOCK_M }, (_, r) => Array.from({ length: BLOCK_K }, (_, kk) => loadA(pidM * BLOCK_M + r, k0, kk)));
      const b = Array.from({ length: BLOCK_K }, (_, kk) => Array.from({ length: BLOCK_N }, (_, c) => loadB(k0, kk, pidN * BLOCK_N + c)));
      for (let r = 0; r < BLOCK_M; r++) for (let c = 0; c < BLOCK_N; c++) for (let kk = 0; kk < BLOCK_K; kk++) acc[r][c] += a[r][kk] * b[kk][c];
    }
    for (let r = 0; r < BLOCK_M; r++) for (let c = 0; c < BLOCK_N; c++) {
      const i = pidM * BLOCK_M + r, j = pidN * BLOCK_N + c;
      if (i < M && j < N) C[i][j] = Math.max(acc[r][c], 0);        // ReLU 后按 mask 写回
    }
  }
}
let maxAbsDiff = 0;
for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) {
  let s = 0; for (let k = 0; k < K; k++) s += A[i][k] * B[k][j];
  maxAbsDiff = Math.max(maxAbsDiff, Math.abs(Math.max(s, 0) - C[i][j]));
}
console.log({ part2: { grid: [cdiv(M, BLOCK_M), cdiv(N, BLOCK_N)], iterationsPerProgram: cdiv(K, BLOCK_K), iterationsTotal, maskedSlots, maxAbsDiff, C } });`};
})();
