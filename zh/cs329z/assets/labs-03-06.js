/* CS329Z lecture-aligned code demos (03 BM25, 06 tool-calling loop). Everything runs in memory; no model or network calls. */
(() => {
'use strict';
const C = window.COURSE_CODE ||= {};

// Lecture 3 p.40–42 (BM25) + HW1 Problem 3 (k1 = 1.5, b = 0.75, Lucene IDF, inverted index).
C['cs329z-03'] = {
  name: 'BM25：倒排索引、两种 IDF 与词频饱和',
  instructions: [
    '先运行默认查询 "when is the milestone due"：看 idf 表里 the 的两种 IDF。它出现在 5 篇中的 4 篇，讲义 p.41 的原始公式给出负数 −1.0986，HW1 指定的 Lucene 版本给出 +0.2877。',
    '比较 original 和 lucene 两个排名：顺序相同（d1 > d3 > d2 > d4），但原始 IDF 下 the 每出现一次都在扣分，连排第一的 d1 都是负分，只含 the 的 d4 也被列了出来、分数最低；Lucene 版本保证每个匹配的词都只加分。',
    '看 tfSaturation：文档长度等于平均长度时，词频从 1 增加到 10，词频因子只从 1 增加到约 2.17，上限是 k1 + 1 = 2.5。把 k1 改成 0.5 再运行，饱和得更快。',
    '把 query 改成 "revenue growth"：growth 不在任何文档中（文档里是 grew），只有 revenue 匹配——这就是讲义说的 BM25 抓不住换了说法的词。'
  ],
  expected: '默认：N = 5，文档长度 [14, 10, 9, 7, 11]，avgdl = 10.2；idf(the) 原始 −1.0986、Lucene 0.2877；Lucene 排名 d1 ≈ 2.9400、d3 ≈ 2.3737、d2 ≈ 1.2282、d4 ≈ 0.4009；原始排名 d1 ≈ −0.0900、d3 ≈ −0.4956、d2 ≈ −0.8047、d4 ≈ −1.5309；tfSaturation = [1, 1.4286, 1.6667, 1.8182, 2.1739]。query 改成 "revenue growth" 后只剩 d4 ≈ 1.3390。',
  code: `// 讲义第 3 讲 p.25–26 里出现过的几段文字，当作 5 篇文档
const docs = [
  'Queue log, last 3 weeks: Tue 4pm 14 waiting avg; Thu 9am 3 waiting.',
  'The project milestone is due Week 6, Thursday 11:59pm.',
  'Late days may not be applied to the milestone.',
  'The final report is due Week 10.',
  "The company's revenue grew by 3% over the previous quarter."
];
const query = 'when is the milestone due';
const k1 = 1.5, b = 0.75;                       // HW1 第 3 题指定的参数

// 小写，按非字母数字切分（与 HW1 提供的 tokenize 规则相同）
const tokenize = s => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// 一次遍历建倒排索引：term -> [[docId, tf], ...]
const index = new Map(), lengths = [];
docs.forEach((text, id) => {
  const toks = tokenize(text);
  lengths.push(toks.length);
  const tf = new Map();
  for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
  for (const [t, f] of tf) {
    if (!index.has(t)) index.set(t, []);
    index.get(t).push([id, f]);
  }
});
const N = docs.length;
const avgdl = lengths.reduce((a, c) => a + c, 0) / N;

const idfOriginal = n => Math.log((N - n + 0.5) / (n + 0.5));      // 讲义 p.41
const idfLucene = n => Math.log(1 + (N - n + 0.5) / (n + 0.5));    // HW1：括号里 +1，永远为正
const tfFactor = (f, len) => f * (k1 + 1) / (f + k1 * (1 - b + b * len / avgdl));

// 只读取查询词的倒排表；每个不同的查询词只算一次；同分时 doc id 小的在前
function search(q, idf, k = 3) {
  const scores = new Map();
  for (const t of new Set(tokenize(q))) {
    const postings = index.get(t) || [];
    const w = idf(postings.length);
    for (const [id, f] of postings) scores.set(id, (scores.get(id) || 0) + w * tfFactor(f, lengths[id]));
  }
  return [...scores].sort((x, y) => y[1] - x[1] || x[0] - y[0]).slice(0, k)
    .map(([id, s]) => ({ doc: 'd' + id, score: +s.toFixed(4) }));
}

const terms = [...new Set(tokenize(query))];
console.log({ N, avgdl, lengths });
console.log({ idf: terms.map(t => {
  const n = (index.get(t) || []).length;
  return { term: t, n, original: +idfOriginal(n).toFixed(4), lucene: +idfLucene(n).toFixed(4) };
}) });
console.log({ original: search(query, idfOriginal, 5) });
console.log({ lucene: search(query, idfLucene, 5) });
// 文档长度等于平均长度时，词频 f = 1, 2, 3, 4, 10 的词频因子
console.log({ tfSaturation: [1, 2, 3, 4, 10].map(f => +tfFactor(f, avgdl).toFixed(4)) });`
};

// Lecture 6 p.33–36 (ReAct) + p.66–68 (observation masking) + HW1 Problems 5–7 (registry validates before executing; loop limits).
C['cs329z-06'] = {
  name: 'ReAct 工具调用循环：校验、错误回传与观察遮蔽',
  instructions: [
    '默认运行 full：脚本化的“模型”按讲义 ReAct 例子依次搜索 Apple Remote、Front Row、Front Row (software)。第 3 次调用把参数名写成 q，注册表在执行前就返回 invalid_args，错误信息回到上下文，下一轮模型改正后成功，最终 status = done。',
    '比较 full 和 masked 的 contextWords（每次调用模型前的上下文词数）：masked 只保留最近 1 条观察的原文，更早的观察替换成 [observation omitted]。前两次调用时两者一样，从第 3 次调用起 masked 明显更短，最后一次是 90 对 134 个词。',
    '看 budget：把 maxTurns 设为 3，循环在给出答案前停止，status = max_turns，answer 为 null——预算用完不等于任务完成。',
    '把脚本第 4 条也改成 "q"，并在后面再加一条同样错误的回复：连续 3 次格式错误时，循环以 status = malformed 结束。'
  ],
  expected: 'full：status = done，turns = 5，statuses = [ok, ok, invalid_args, ok]，answer = "keyboard function keys"，contextWords = [20, 55, 84, 99, 134]；masked：答案相同，contextWords = [20, 55, 61, 59, 90]；budget：status = max_turns，turns = 3，answer = null。',
  code: `// 一个只读工具：在一个小“百科”里按标题查条目（内容取自讲义第 6 讲 p.34 的 ReAct 轨迹）
const WIKI = {
  'Apple Remote': 'The Apple Remote is a remote control introduced in October 2005 by Apple, originally designed to control the Front Row media center program.',
  'Front Row (software)': 'Front Row is a discontinued media center software by Apple. It is controlled by an Apple Remote or the keyboard function keys.'
};
const tools = {
  search: {
    parameters: { query: 'string' }, required: ['query'],
    fn: ({ query }) => WIKI[query] ?? \`Could not find [\${query}]. Similar: ['Front Row Seat to Earth', 'Front Row Motorsports', 'Front Row (software)']\`
  }
};

// 注册表：先按模式校验（未知工具 / 参数不合法），通过了才执行；永远返回结果而不抛异常
function validate(name, args) {
  const t = tools[name];
  if (!t) return { status: 'unknown_tool', content: \`no tool named \${name}\` };
  for (const r of t.required) if (!(r in args)) return { status: 'invalid_args', content: \`missing required argument "\${r}"\` };
  for (const [k, v] of Object.entries(args))
    if (!(k in t.parameters) || typeof v !== t.parameters[k]) return { status: 'invalid_args', content: \`unexpected argument "\${k}"\` };
  return null;
}
function execute(name, args) {
  const rejected = validate(name, args);
  if (rejected) return rejected;
  try { return { status: 'ok', content: String(tools[name].fn(args)) }; }
  catch (e) { return { status: 'tool_error', content: e.message }; }
}

// 脚本化的模型回复：每轮最多一个调用，或者给出最终答案（代替真实 LM，便于复现）
const script = [
  'Thought: I need to search Apple Remote. Action: {"tool":"search","args":{"query":"Apple Remote"}}',
  'Thought: It was designed for Front Row. Action: {"tool":"search","args":{"query":"Front Row"}}',
  'Thought: Try the software page. Action: {"tool":"search","args":{"q":"Front Row (software)"}}',
  'Thought: The argument must be named query. Action: {"tool":"search","args":{"query":"Front Row (software)"}}',
  'Thought: Front Row is controlled by an Apple Remote or the keyboard function keys. Final: keyboard function keys'
];
function parse(reply) {
  const a = reply.match(/Action: (\\{.*\\})$/);
  if (a) { try { const o = JSON.parse(a[1]); return { call: { name: o.tool, args: o.args || {} } }; } catch { return { error: 'unparsable call' }; } }
  const f = reply.match(/Final: (.*)$/);
  return f ? { final: f[1] } : { error: 'no call and no final answer' };
}
const words = s => s.split(/\\s+/).filter(Boolean).length;   // 用词数近似词元数

function run({ maxTurns = 8, keepLast = Infinity } = {}) {
  const events = [{ type: 'user', text: 'Aside from the Apple Remote, what other device can control the program Apple Remote was originally designed to interact with?' }];
  const statuses = [], contextWords = [];
  let malformed = 0;
  for (let turn = 0; turn < maxTurns; turn++) {
    // 观察遮蔽：只保留最近 keepLast 条观察原文，其余替换成占位符
    const obs = events.map((e, i) => e.type === 'obs' ? i : -1).filter(i => i >= 0);
    const hidden = new Set(obs.slice(0, Math.max(0, obs.length - keepLast)));
    const context = events.map((e, i) => hidden.has(i) ? '[observation omitted]' : e.text).join('\\n');
    contextWords.push(words(context));
    const reply = script[turn] ?? 'Thought: I am stuck.';
    events.push({ type: 'assistant', text: reply });
    const p = parse(reply);
    if (p.final) return { status: 'done', answer: p.final, turns: turn + 1, statuses, contextWords };
    const r = p.error ? { status: 'malformed', content: p.error } : execute(p.call.name, p.call.args);
    statuses.push(r.status);
    malformed = ['ok', 'tool_error'].includes(r.status) ? 0 : malformed + 1;
    if (malformed >= 3) return { status: 'malformed', answer: null, turns: turn + 1, statuses, contextWords };
    events.push({ type: 'obs', text: \`Observation [\${r.status}]: \${r.content}\` });   // 错误也回到上下文，让模型改正
  }
  return { status: 'max_turns', answer: null, turns: maxTurns, statuses, contextWords };
}

console.log({ full: run() });
console.log({ masked: run({ keepLast: 1 }) });
console.log({ budget: run({ maxTurns: 3 }) });`
};
})();
