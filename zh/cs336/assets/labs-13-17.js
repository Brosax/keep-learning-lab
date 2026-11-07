/* CS336 13–17, aligned with the 2026 lectures.
 * 14 code: lecture_14.py · hash_functions() / exact_deduplication() / jaccard_minhash()
 * 14 visual: lecture_14.py · locality_sensitive_hashing() get_prob_collision()
 * 15 code: Lecture 15 (2026) p.57–58 DPO loss and gradient weight
 * 16 code: Lecture 16 (2026) p.20 GRPO group-normalized advantages and p.23–24 Dr. GRPO
 * 13 and 17 have no module.
 */
(() => {
'use strict';
const {text,line,fmt}=window.MLVis;
const V=window.COURSE_VISUALS ||= {},C=window.COURSE_CODE ||= {};
const title=s=>text(24,28,s,'v-title');

C['cs336-14']={name:'精确去重与 MinHash：用哈希估计 Jaccard 相似度',
 instructions:['先运行默认代码：murmur3("hello") = 613153351，与讲义 mmh3.hash("hello") 相同；精确去重后只去掉了重复的 "hello"，"Hello!" 与 "hello" 大小写不同，仍被保留。','看 MinHash 部分：A = {1,2,3,4}、B = {1,2,3,5} 的真实 Jaccard 是 3/5 = 0.6；用 100 个种子，最小哈希相同的比例也是 0.6。','把 n 改成 10、20、1000，观察估计值怎样围绕 0.6 波动（10 个种子时是 0.7）；再把 B 改成和 A 完全相同，估计值应为 1。'],
 expected:'默认：helloHash = 613153351；deduped = ["hi","bye","hello","hello there","Hello!"]；jaccard = 0.6；n = 100 时 matches = 60，estimatedJaccard = 0.6。',
 code:`// MurmurHash3_x86_32，与 Python mmh3.hash(key, seed) 一致（返回有符号 32 位整数）
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
function murmur3(key, seed = 0) {
  const data = utf8(key), c1 = 0xcc9e2d51, c2 = 0x1b873593, rotl = (x, r) => (x << r) | (x >>> (32 - r));
  let h = seed >>> 0, i = 0;
  for (; i + 4 <= data.length; i += 4) {
    let k = data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24);
    k = Math.imul(rotl(Math.imul(k, c1), 15), c2);
    h = (Math.imul(rotl(h ^ k, 13), 5) + 0xe6546b64) | 0;
  }
  let k = 0;
  switch (data.length & 3) {
    case 3: k ^= data[i + 2] << 16;
    case 2: k ^= data[i + 1] << 8;
    case 1: k ^= data[i]; h ^= Math.imul(rotl(Math.imul(k, c1), 15), c2);
  }
  h ^= data.length;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h | 0;
}

// exact_deduplication()：按哈希排序、分组，每组保留第一个（itertools.groupby 的写法）
const items = ["Hello!", "hello", "hello there", "hello", "hi", "bye"];
const sorted = items.map((s, i) => ({ s, h: murmur3(s), i })).sort((a, b) => a.h - b.h || a.i - b.i);
const deduped = sorted.filter((x, j) => j === 0 || x.h !== sorted[j - 1].h).map(x => x.s);
console.log({ helloHash: murmur3("hello"), hashes: Object.fromEntries(items.map(s => [s, murmur3(s)])), deduped });

// jaccard_minhash()
const A = new Set(["1", "2", "3", "4"]);
const B = new Set(["1", "2", "3", "5"]);
const jaccard = [...A].filter(x => B.has(x)).length / new Set([...A, ...B]).size;
const minhash = (S, seed) => Math.min(...[...S].map(x => murmur3(x, seed)));
const n = 100;                                   // 随机哈希函数（种子）的个数
let matches = 0;
for (let seed = 0; seed < n; seed++) if (minhash(A, seed) === minhash(B, seed)) matches++;
console.log({ jaccard, n, matches, estimatedJaccard: matches / n });`};

// lecture_14.py · get_prob_collision(sim, b, r) = 1 − (1 − sim^r)^b; sims as in the lecture.
const SIMS=[0.7,0.75,0.8,0.85,0.9,0.95,0.98];
const collide=(s,b,r)=>1-(1-s**r)**b;
function lsh(b,r){return {b,r,n:b*r,threshold:(1/b)**(1/r),probs:SIMS.map(s=>collide(s,b,r)),probAt08:collide(.8,b,r)};}
const LSH_B=[5,10,20];
V['cs336-14']={title:'LSH 的 S 曲线：b 个 band、每 band r 个哈希',param:'每个 band 的哈希数 r',min:1,max:30,step:1,value:10,
 steps:['b = 5 个 band','b = 10 个 band','b = 20 个 band'],
 render(step,r){
  const b=LSH_B[step],m=lsh(b,r);
  const X=s=>80+s*620,Y=p=>290-p*220;
  let svg=title(`lecture_14 · locality_sensitive_hashing()：b = ${b}，r = ${r}`);
  svg+=line(80,290,700,290,'v-axis')+line(80,70,80,290,'v-axis')+text(157,324,'Jaccard 相似度','v-center v-small')+text(86,62,'P(碰撞)','v-small');
  [0,.25,.5,.75,1].forEach(s=>{svg+=line(X(s),290,X(s),295,'v-axis')+text(X(s),308,String(s),'v-center v-small');});
  [0,.5,1].forEach(p=>{svg+=text(74,Y(p)+4,String(p),'v-end v-small');});
  svg+=line(X(0),Y(0),X(1),Y(1),'v-axis')+text(X(.3),Y(.3)-8,'单个 MinHash：P = Jaccard','v-small');
  const pts=[];for(let i=0;i<=200;i++){const s=i/200;pts.push(`${X(s).toFixed(1)},${Y(collide(s,b,r)).toFixed(1)}`);}
  svg+=`<polyline points="${pts.join(' ')}" class="v-teal"/>`;
  svg+=line(X(m.threshold),70,X(m.threshold),290,'v-loop')+text(X(m.threshold)-6,84,`阈值 (1/b)^(1/r) = ${fmt(m.threshold,3)}`,'v-end v-small');
  SIMS.forEach((s,i)=>{svg+=`<circle cx="${X(s)}" cy="${Y(m.probs[i])}" r="4" class="v-dot"/>`;});
  svg+=text(716,56,`n = b·r = ${m.n} 个哈希`,'v-end v-small');
  const list=SIMS.map((s,i)=>`${s}→${fmt(m.probs[i],3)}`).join('，');
  const bodies=[
   `讲义先算的例子：b = 5、r = 10 时，相似度 0.8 的两个文档碰撞概率为 0.433。一个 band 内 r 个 MinHash 全部相等的概率是 s^r（“与”），b 个 band 中至少一个相等的概率是 1 − (1 − s^r)^b（“或”）。当前 r = ${r}：${list}。`,
   `b = 10：讲义依次比较 r = 10 和 r = 20。增大 r 会让曲线更陡、并向右移（更难匹配）；当前 r = ${r} 时阈值约 ${fmt(m.threshold,3)}，s = 0.8 的碰撞概率 ${fmt(m.probAt08,4)}。各相似度：${list}。`,
   `b = 20：讲义的结论是增大 b 会把曲线向左移（更容易匹配）。当前 r = ${r} 时阈值约 ${fmt(m.threshold,3)}，s = 0.8 的碰撞概率 ${fmt(m.probAt08,4)}。讲义最后的实际设置 n = 9000、b = 20、r = 450，阈值 (1/20)^(1/450) ≈ 0.993，只把几乎完全相同的文档判为重复。`];
  return {svg,metrics:m,formula:'P(碰撞) = 1 − (1 − s^r)^b；阈值 ≈ (1/b)^(1/r)',body:bodies[step],
   result:`b = ${b}, r = ${r} · 阈值 ${fmt(m.threshold,3)} · P(s = 0.8) = ${fmt(m.probAt08,4)}`,
   note:'阈值 (1/b)^(1/r) 是讲义给出的相变位置近似。曲线假设每个 MinHash 的碰撞概率恰好等于 Jaccard 且相互独立；真实去重时还要对候选对再算一次真实 Jaccard。'};
 }};

C['cs336-15']={name:'DPO 损失：隐式奖励的差与梯度权重',
 instructions:['先运行默认代码（β = 0.1）：4 个偏好对的 margin 为 0.2、0、−0.3、0.4，平均损失 0.6647；margin 为 0 的那一对损失是 ln 2 ≈ 0.6931。','把 beta 改成 0.5：margin 放大 5 倍，排对的样本损失更小，排错的样本（第 3 对）损失和梯度权重更大。','把第 4 对的 policy 对数概率改成与 reference 完全相同，验证它的损失回到 ln 2、权重回到 0.5。'],
 expected:'β = 0.1：margin = [0.2, 0, −0.3, 0.4]，loss ≈ [0.5981, 0.6931, 0.8544, 0.5130]，weight ≈ [0.4502, 0.5, 0.5744, 0.4013]，meanLoss ≈ 0.6647，accuracy = 0.5。',
 code:`const beta = 0.1;
// 补充的 4 个偏好对：整段回答的对数概率 [log πθ(y_w), log π_ref(y_w), log πθ(y_l), log π_ref(y_l)]
const pairs = [
  [-20, -21, -25, -24],
  [-30, -30, -28, -28],
  [-18, -17, -22, -24],
  [-40, -45, -41, -42],
];
const sigmoid = x => 1 / (1 + Math.exp(-x));
const r4 = x => Math.round(x * 1e4) / 1e4;

// 讲义 p.57：L = −log σ( β log(πθ(y_w)/π_ref(y_w)) − β log(πθ(y_l)/π_ref(y_l)) )
// 讲义 p.58：梯度 ∝ σ(r̂(y_l) − r̂(y_w)) · [∇log πθ(y_w) − ∇log πθ(y_l)]
const rows = pairs.map(([pw, rw, pl, rl]) => {
  const rewardW = beta * (pw - rw);              // 隐式奖励 r̂(y_w)
  const rewardL = beta * (pl - rl);              // 隐式奖励 r̂(y_l)
  const margin = rewardW - rewardL;
  return { rewardW: r4(rewardW), rewardL: r4(rewardL), margin: r4(margin),
    loss: r4(Math.log1p(Math.exp(-margin))),      // −log σ(margin)
    weight: r4(sigmoid(-margin)) };               // 排错得越厉害，权重越大
});
const meanLoss = rows.reduce((s, r) => s + Math.log1p(Math.exp(-r.margin)), 0) / rows.length;
console.log({ beta, rows, meanLoss: r4(meanLoss), accuracy: rows.filter(r => r.margin > 0).length / rows.length });`};

C['cs336-16']={name:'GRPO 组内优势：除以标准差与 Dr. GRPO',
 instructions:['先运行默认代码：每组 8 个回答、奖励 0/1。hard 组只对 1 个，GRPO 给它 2.6450 的优势；medium 组对一半，优势只有 ±0.9998——除以标准差会放大“太难”和“太容易”的题。','看 solved 组：全部答对，均值 1、标准差 0，所有优势都是 0，这组不提供学习信号；把 eps 改成 0 会得到 0/0 = NaN。','看长度部分：GRPO 把每条回答的优势再除以自身长度，短的正确回答每个 token 得到更大的权重、长的错误回答每个 token 受罚更小；Dr. GRPO 改用固定常数（这里 512），去掉这种长度偏差。'],
 expected:'hard：GRPO [2.645, −0.3779×7]，Dr. GRPO [0.875, −0.125×7]，样本标准差版 [2.4749, −0.3536×7]；medium：GRPO ±0.9998，Dr. GRPO ±0.5；solved 全为 0。长度：GRPO 正确回答逐 token 权重 0.01、0.005、0.0033、0.0025，Dr. GRPO 恒为 ±0.001。',
 code:`const eps = 1e-4;   // 讲义 p.20：(rewards − mean) / (std + 1e-4)
const groups = {    // 补充：每题采样 G = 8 个回答，验证器给 0/1 奖励
  hard:   [1, 0, 0, 0, 0, 0, 0, 0],
  medium: [1, 1, 1, 1, 0, 0, 0, 0],
  easy:   [1, 1, 1, 1, 1, 1, 1, 0],
  solved: [1, 1, 1, 1, 1, 1, 1, 1],
};
const mean = r => r.reduce((a, b) => a + b, 0) / r.length;
const std = (r, ddof = 0) => { const m = mean(r); return Math.sqrt(r.reduce((s, x) => s + (x - m) ** 2, 0) / (r.length - ddof)); };
const r4 = x => Math.round(x * 1e4) / 1e4;

const advantages = {};
for (const [name, r] of Object.entries(groups)) {
  const m = mean(r), s = std(r), sSample = std(r, 1);
  advantages[name] = {
    mean: m, std: r4(s),
    grpo: r.map(x => r4((x - m) / (s + eps))),            // numpy .std() 是总体标准差
    drGrpo: r.map(x => r4(x - m)),                        // Dr. GRPO：不除以标准差
    sampleStd: r.map(x => r4((x - m) / (sSample + 1e-6))) // 对照：torch.std 默认除以 G − 1
  };
}
console.log(advantages);

// 长度：GRPO 每条回答的损失按自身长度 |o_i| 平均；Dr. GRPO 除以固定常数（这里取 512）
const lengths = [100, 200, 300, 400, 100, 200, 300, 400];   // medium 组，前 4 个答对
const med = groups.medium, m = mean(med), s = std(med);
console.log({
  grpoPerToken: med.map((x, i) => r4((x - m) / (s + eps) / lengths[i])),
  drGrpoPerToken: med.map(x => r4((x - m) / 512)),
});`};
})();
