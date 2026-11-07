# 课程数据格式

一门课 = `content/<课程>.json` + 可选的实验脚本 `zh/<课程>/assets/labs-*.js` + 数值校验 `scripts/oracles/<课程>.mjs`。
运行 `python scripts/build-courses.py` 后，会生成 `zh/<课程>/index.html` 和 `data.js`。

## 课程层级

```jsonc
{
  "id": "cme295",
  "code": "CME295",
  "title": "Transformer 与大语言模型",
  "subtitle": "…",
  "description": "…",
  "year": "2026 秋季",
  "sourceUrl": "https://…",                 // 官方课程主页
  "instructors": ["…"],
  "prerequisites": ["…"],
  "modules": [{"id": "foundations", "title": "…", "description": "…"}],
  "lessons": [ /* 见下 */ ],
  "assignments": [ … ],
  "resources": [ … ],                        // 课程级资料
  "notice": "本站是基于官方公开讲义的中文导学，不是官方课程…",
  "lectureAligned": true,                    // 按讲义对齐修订后设为 true，测试会强制检查出处
  "experimentsMode": "lesson",               // 图示和代码按讲次显式绑定
  "experimentScripts": ["assets/labs-01-03.js"],  // 没有任何模块时可以是空数组
  "quizRevision": "2026-11-07-lecture-aligned"    // 修改题目时更新
}
```

## 讲次层级

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | `"01"`、`"02"`…… **不能改** |
| `module` | ✅ | 对应 `modules[].id` |
| `title` | ✅ | 中文标题，反映讲义主题 |
| `originalTitle` | ✅ | 课表上的英文原标题 |
| `summary` | ✅ | 一句话：这一讲解决什么问题 |
| `objectives` | ✅ | 3 条左右学习目标，学习者可以勾选 |
| `sections` | ✅ | 正文段落，顺序跟随讲义，数量不固定 |
| `quiz` | ✅ | 至少 2 题 |
| `resources` | ✅* | 本讲讲义链接，带 `#page=` 锚点。*没有讲义时可以为空，但必须写 `sourceStatus` |
| `sourceStatus` | 按需 | 讲义没公开或不完整时**必须**写，会作为提示框显示在讲次页头 |
| `visual` | 按需 | 交互图示的键，固定为 `"<课程>-<id>"` |
| `codeDemo` | 按需 | 可运行代码的键，固定为 `"<课程>-<id>"` |
| `exercise` | 按需 | 课后动手练习 |

## 段落（`sections[]`）

```jsonc
{
  "title": "自注意力：query、key、value",
  "body": ["第一段……", "第二段……"],          // 字符串或字符串数组
  "source": "Lecture 1 · p.62–78（Self-attention）",  // lectureAligned 课程必填
  "kind": "worked-example",                 // 可选：worked-example = 手算例题
  "formula": "Attention(Q,K,V)=softmax(QKᵀ/√d_k)V",  // 可选
  "flow": ["分词", "嵌入", "自注意力", "前馈层", "输出分布"],    // 可选：静态流程链
  "table": {"columns": ["方法", "优点", "代价"], "rows": [["…", "…", "…"]]},  // 可选：对比表
  "code": "x = …",                          // 可选：静态代码片段（只展示，不运行）
  "bullets": ["要点或常见误区"]                // 可选
}
```

`source` 的写法是 `<讲义名> · p.<页码>（<讲义里的小节名>）`。讲稿是 `.py` 文件时，写函数名，例如 `lecture_06.py · triton_softmax()`。

## 交互图示（`visual`）

在 `zh/<课程>/assets/labs-*.js` 里注册：

```js
const V = window.COURSE_VISUALS ||= {};
V['cme295-03'] = {
  title: '…',                         // 每讲唯一
  param: '参数名', min: 0, max: 1, step: 0.1, value: 0.5,   // 滑块（默认值必须落在步长网格上）
  steps: ['第一步', '第二步', …],     // 至少 2 步
  render(step, value) {
    return { svg, formula, body, result, note, metrics };   // metrics 供 oracle 校验
  }
};
```

绘图辅助函数在 `window.MLVis`（定义在 `zh/ai/assets/lab-core.js`）。

## 代码演示（`codeDemo`）

```js
const C = window.COURSE_CODE ||= {};
C['cme295-03'] = {
  name: '…',                          // 每讲唯一
  instructions: ['改一下 X，观察 Y'],
  expected: '默认输出……',
  code: `/* 浏览器沙箱里运行的 JS，用 console.log 输出对象 */`
};
```

代码在隔离的 iframe + worker 里运行，1 秒超时，不能联网。

## 数值校验（`scripts/oracles/<课程>.mjs`）

每个带 `visual` 或 `codeDemo` 的讲次都要有一段 `mark('<id>')`，用**独立推导出的数值**核对 `metrics(...)` 和 `logged(...)`，不能复用被测代码。没有模块的讲次不要 `mark`。
