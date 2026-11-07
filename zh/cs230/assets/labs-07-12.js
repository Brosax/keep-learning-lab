/* CS230 07–12: three lessons need modules.
 * 08 visual — avoidable bias vs variance as human-level error changes (C3M1 p.27–30, p.40).
 * 10 code — convolution, stride, pooling and shape/parameter bookkeeping with the slide numbers (C4M1).
 * 12 code — scaled dot-product self-attention for one query (C5M4 p.6–7).
 * Lessons 07, 09 and 11 are text, tables and worked examples only. */
(() => {
'use strict';
const {text,line,rect,fmt}=window.MLVis;
const V=window.COURSE_VISUALS ||= {},C=window.COURSE_CODE ||= {};
const title=s=>text(24,28,s,'v-title');

// ---------- 08 · visual: avoidable bias vs variance ----------
const CAT={train:8,dev:10};
function biasVariance(human){
 const avoidableBias=CAT.train-human,variance=CAT.dev-CAT.train,gap=avoidableBias-variance;
 return {human,train:CAT.train,dev:CAT.dev,avoidableBias,variance,focus:Math.abs(gap)<1e-9?'tie':gap>0?'bias':'variance'};
}
V['cs230-08']={title:'可避免偏差还是方差：人类水平误差改变结论',param:'人类水平误差（%）',min:0,max:7.5,step:.5,value:1,
 steps:['三个误差：人类水平、训练、验证','可避免偏差 = 训练 − 人类；方差 = 验证 − 训练','先处理较大的那一项'],
 render(step,human){
  const m=biasVariance(human);let svg=title('讲义 p.30：训练误差 8%，验证误差 10%');
  const unit=52,x=v=>70+v*unit,y0=96;
  svg+=line(70,y0+150,x(12),y0+150,'v-axis');
  [0,2,4,6,8,10,12].forEach(v=>svg+=line(x(v),y0+146,x(v),y0+154,'v-axis')+text(x(v),y0+172,v+'%','v-center v-small'));
  const mark=(v,label,color,row)=>`<rect x="${x(v)-2}" y="${y0+row*44}" width="4" height="${150-row*44}" fill="${color}"/>`+text(x(v),y0+row*44-8,`${label} ${fmt(v,1)}%`,'v-center v-small');
  svg+=mark(m.human,'人类水平','#ffe38a',0)+mark(m.train,'训练','#50dfc2',1)+mark(m.dev,'验证','#7aa2f7',2);
  if(step>=1){
   svg+=`<rect x="${x(m.human)}" y="${y0+180}" width="${m.avoidableBias*unit}" height="18" fill="#f28b82" opacity=".75"/>`+text(x(m.human)+4,y0+214,`可避免偏差 ${fmt(m.avoidableBias,1)}`,'v-small');
   svg+=`<rect x="${x(m.train)}" y="${y0+180}" width="${m.variance*unit}" height="18" fill="#7aa2f7" opacity=".75"/>`+text(x(m.train)+4,y0+232,`方差 ${fmt(m.variance,1)}`,'v-small');
  }
  if(step>=2)svg+=text(470,62,m.focus==='bias'?'先降偏差：更大的模型、训练更久、更好的优化算法':m.focus==='variance'?'先降方差：更多数据、正则化':'两者相当：都要处理','v-center v-small');
  const advice={bias:'先降可避免偏差：训练更大的模型、训练更久或换更好的优化算法（动量、RMSprop、Adam）、搜索网络结构。',variance:'先降方差：获取更多数据、正则化（L2、dropout、数据增强）、搜索网络结构。',tie:'两者一样大，两个方向都值得做。'};
  const bodies=[
   `讲义的两个情景用同一组训练误差 8%、验证误差 10%，只是人类水平误差不同。人类水平误差在这里被当作 Bayes 误差的代理。当前人类水平误差 = ${fmt(human,1)}%。`,
   `可避免偏差 = 8% − ${fmt(human,1)}% = ${fmt(m.avoidableBias,1)} 个百分点；方差 = 10% − 8% = 2 个百分点。人类水平误差越高，训练误差离“最好可能”越近，可避免偏差就越小。`,
   `${m.focus==='bias'?'可避免偏差大于方差。':m.focus==='variance'?'方差大于可避免偏差。':''}${advice[m.focus]}讲义情景 A（人类 1%）是 7% 对 2%，先降偏差；情景 B（人类 7.5%）是 0.5% 对 2%，先降方差。结论在人类水平误差 = 6% 时翻转。`];
  return {svg,metrics:m,formula:'可避免偏差 = 训练误差 − 人类水平误差；方差 = 验证误差 − 训练误差',body:bodies[step],
   result:`可避免偏差 ${fmt(m.avoidableBias,1)} · 方差 ${fmt(m.variance,1)} · ${m.focus==='bias'?'先降偏差':m.focus==='variance'?'先降方差':'两者相当'}`,
   note:'数字来自 C3M1 p.30 的两个情景；滑块在 0% 到 7.5% 之间连续改变人类水平误差，这是对讲义两个端点的插值。建议的做法来自 p.40。'};
 }};

// ---------- 10 · code: convolution bookkeeping with the C4M1 numbers ----------
C['cs230-10']={name:'卷积、步长与池化：用讲义的数字逐个核对',
 instructions:[
  '运行后对照 C4M1 p.7（边缘检测 4×4 输出）、p.17（stride 2 的 3×3 输出）、p.33–34（最大池化、平均池化）检查每个数；p.17 手写的 83 和 127 与重算结果 88、117 不同，自己挑一个窗口手算确认。',
  '把 layers 换成 2025 期中复习幻灯片 25 的网络（输入 128×128×3，CONV-9-32、POOL-2、CONV-5-64……），核对你手算的尺寸和参数。',
  '在 conv2d 里把滤波器上下、左右翻转后再计算，看看数学定义的“卷积”与深度学习里的互相关（p.19）输出有什么不同。'],
 expected:'边缘检测第一行 [−5, −4, 0, 8]，最后一个数 −16；stride 2 输出 [[91, 100, 88], [69, 91, 117], [44, 72, 74]]（讲义手写的 83、127 是笔误）；p.29 网络 39×39×3 → 37×37×10 → 17×17×20 → 7×7×40，展平 1960；10 个 3×3×3 滤波器 280 个参数；全连接 3072 × 4704 ≈ 1445 万个权重，6 个 5×5×3 滤波器只要 456 个参数。',
 code:`// C4M1：输出尺寸 ⌊(n + 2p − f)/s⌋ + 1（p.18）；深度学习的“卷积”不翻转滤波器（p.19）
const outSize = (n, f, p = 0, s = 1) => Math.floor((n + 2 * p - f) / s) + 1;
function conv2d(image, kernel, {stride = 1, pad = 0} = {}) {
  const n = image.length, f = kernel.length, size = outSize(n, f, pad, stride);
  const at = (i, j) => (i < pad || j < pad || i >= n + pad || j >= n + pad) ? 0 : image[i - pad][j - pad];
  return Array.from({length: size}, (_, r) => Array.from({length: size}, (_, c) => {
    let sum = 0;
    for (let i = 0; i < f; i++) for (let j = 0; j < f; j++) sum += at(r * stride + i, c * stride + j) * kernel[i][j];
    return sum;
  }));
}
function pool(image, f, s, reduce) {
  const size = outSize(image.length, f, 0, s);
  return Array.from({length: size}, (_, r) => Array.from({length: size}, (_, c) => {
    const window = [];
    for (let i = 0; i < f; i++) for (let j = 0; j < f; j++) window.push(image[r * s + i][c * s + j]);
    return reduce(window);
  }));
}

// p.7：6×6 图像与竖直边缘检测器
const image6 = [[3,0,1,2,7,4],[1,5,8,9,3,1],[2,7,2,5,1,3],[0,1,3,1,7,8],[4,2,1,6,2,8],[2,4,5,2,3,9]];
const vertical = [[1,0,-1],[1,0,-1],[1,0,-1]];
const edge = conv2d(image6, vertical);
// p.8：左亮右暗的图像
const step = Array.from({length: 6}, () => [10,10,10,0,0,0]);
// p.17：7×7 图像，stride = 2
const image7 = [[2,3,7,4,6,2,9],[6,6,9,8,7,4,3],[3,4,8,3,8,9,7],[7,8,3,6,6,3,4],[4,2,1,8,3,4,6],[3,2,4,1,9,8,3],[0,1,3,9,2,1,4]];
const strided = conv2d(image7, [[3,4,4],[1,0,2],[-1,0,3]], {stride: 2});
console.log({edge, edgeOnStep: conv2d(step, vertical), sameSize: conv2d(image6, vertical, {pad: 1}).length, strided});

// p.33：5×5 最大池化 f = 3, s = 1；p.34：4×4 平均池化 f = 2, s = 2
const maxPool = pool([[1,3,2,1,3],[2,9,1,1,5],[1,3,2,3,2],[8,3,5,1,0],[5,6,1,2,9]], 3, 1, w => Math.max(...w));
const avgPool = pool([[1,3,2,1],[2,9,1,1],[1,4,2,3],[5,6,1,2]], 2, 2, w => w.reduce((a, b) => a + b, 0) / w.length);
console.log({maxPool, avgPool});

// p.29：一个简单卷积网络；每层参数 = (f·f·输入通道 + 1)·滤波器数
const layers = [{f: 3, s: 1, p: 0, filters: 10}, {f: 5, s: 2, p: 0, filters: 20}, {f: 5, s: 2, p: 0, filters: 40}];
let shape = [39, 39, 3];
const trace = [{layer: 'input', shape: shape.join('×'), params: 0}];
for (const [k, L] of layers.entries()) {
  const n = outSize(shape[0], L.f, L.p, L.s), params = (L.f * L.f * shape[2] + 1) * L.filters;
  shape = [n, n, L.filters];
  trace.push({layer: 'conv' + (k + 1), shape: shape.join('×'), params});
}
console.table(trace);
console.log({flatten: shape[0] * shape[1] * shape[2],
  tenFilters3x3x3: (3 * 3 * 3 + 1) * 10,            // p.26
  fullyConnected: 3072 * 4704,                      // p.40：32×32×3 → 28×28×6 全连接
  convSixFilters5x5x3: (5 * 5 * 3 + 1) * 6});       // p.40 手写为 156，漏了 3 个输入通道`};

// ---------- 12 · code: self-attention for one query ----------
C['cs230-12']={name:'自注意力：softmax(QKᵀ/√d_k)V 一步步算',
 instructions:[
  '看 weights：第 3 个词（l\'Afrique）的查询与第 2 个词（visite）的键内积最大，所以权重最大，对应讲义 p.7 手写的 q<3>·k<2>。',
  '把 scale 改成 1（不除以 √d_k），比较 weightsUnscaled：分数被放大后 softmax 更尖锐，几乎只看一个词。',
  '在 Q 里改动第 3 行，让它更像 k<5>，观察注意力怎样转移到 septembre。'],
 expected:'第 3 个词的分数 q·k = [0, 3, 1, 1, 1]，除以 √4 = 2 后 softmax 权重约 [0.096, 0.430, 0.158, 0.158, 0.158]（和为 1），输出 A<3> ≈ [0.570, 0.904]；不缩放时 visite 的权重升到约 0.69。',
 code:`// C5M4 p.6–7。补充数字：5 个词，d_k = 4，d_v = 2；q<i>、k<i>、v<i> 本应由 W^Q、W^K、W^V 乘词向量得到，这里直接给出
const words = ['Jane', 'visite', "l'Afrique", 'en', 'septembre'];
const Q = [[1,0,0,0],[0,1,0,0],[0,1,0,1],[0,0,1,0],[1,0,0,1]];
const K = [[1,0,1,0],[0,2,0,1],[1,1,0,0],[0,0,1,1],[1,0,0,1]];
const Vv = [[1,0],[0,1],[1,1],[0,2],[2,0]];
const dk = K[0].length, scale = Math.sqrt(dk);   // 改成 1 试试

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const softmax = z => { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); };
const attend = (q, sc) => {
  const scores = K.map(k => dot(q, k) / sc);
  const weights = softmax(scores);
  const output = Vv[0].map((_, j) => weights.reduce((s, w, i) => s + w * Vv[i][j], 0));
  return {scores, weights, output};
};

// 第 3 个词 l'Afrique 的查询 q<3>
const q3 = attend(Q[2], scale);
console.log({query: words[2], rawScores: K.map(k => dot(Q[2], k)), weights: q3.weights,
  mostAttended: words[q3.weights.indexOf(Math.max(...q3.weights))], output: q3.output});
console.log({weightsUnscaled: attend(Q[2], 1).weights});

// 矩阵形式：每一行都是一个词的 A<i>，每行权重和为 1
const A = Q.map(q => attend(q, scale));
console.log({rowSums: A.map(r => r.weights.reduce((a, b) => a + b, 0)), outputs: A.map(r => r.output)});`};
})();
