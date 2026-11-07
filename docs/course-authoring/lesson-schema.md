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
| `objectives` | ✅ | 学习目标，学习者可以勾选。新课 3–4 条；修订已有课程时**保持原有数量** |
| `sections` | ✅ | 正文段落，顺序跟随讲义，数量不固定 |
| `quiz` | ✅ | 至少 2 题 |
| `resources` | ✅* | 本讲讲义链接，带 `#page=` 锚点。*没有讲义时可以为空，但必须写 `sourceStatus` |
| `sourceStatus` | 按需 | 讲义没公开、不完整，或者用的是往年讲义时**必须**写，会作为提示框显示在讲次页头。要写成给读者看的完整句子；讲义已正常发布时**不要写这个字段**（不要写 `"published"` 这类标记）。有替代资料时，各段仍然要写 `source` |
| `visual` | 按需 | 交互图示的键，固定为 `"<课程>-<id>"` |
| `codeDemo` | 按需 | 可运行代码的键，固定为 `"<课程>-<id>"` |
| `exercise` | 按需 | 课后动手练习：`{title, instructions[], deliverable}` |

`visual`、`codeDemo`、`exercise` 都是按需字段：构建脚本、`validate-courses.py` 和 `test-reviewed-course.mjs` 只在字段存在时校验它们。

## 段落（`sections[]`）

```jsonc
{
  "title": "自注意力：query、key、value",
  "body": ["第一段……", "第二段……"],          // 字符串或字符串数组
  "source": "Lecture 1 · p.62–78（Self-attention）",  // lectureAligned 课程必填
  "kind": "worked-example",                 // 可选：worked-example = 手算例题
  "math": ["\\mathrm{Attention}(Q,K,V)=\\mathrm{softmax}\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V"],  // 可选：行间公式，TeX，一行一个
  "figure": {"src": "figures/l01-encoder.webp", "alt": "编码器结构图", "caption": "读图要看什么", "source": "Lecture 1 (2026) · p.80"},  // 可选；多张用 figures 数组
  "flow": ["分词", "嵌入", "自注意力", "前馈层", "输出分布"],    // 可选：静态流程链
  "table": {"columns": ["方法", "优点", "代价"], "rows": [["…", "…", "…"]]},  // 可选：对比表
  "code": "x = …",                          // 可选：静态代码片段（只展示，不运行）
  "bullets": ["要点或常见误区"]                // 可选
}
```

### 公式

- **行间公式**用 `math`：TeX 字符串数组，一个等式或一步推导占一行；多步计算可以用 `\begin{aligned}…\end{aligned}` 对齐等号。中文写在 `\text{…}` 里，科学计数法写成 `70\times10^{9}`。
- **行内公式**在正文、要点、表格、流程、学习目标、自测题和图注里用 `\(` … `\)` 包住（JSON 里写成 `\\(` … `\\)`）。普通数字、单位和代码标识符不要包。**讲次的 `title` / `originalTitle` 不能用公式**：它们会出现在导航、首页目录和浏览器标签页标题里，这些地方不渲染公式，需要时用 Unicode 字符（如 `n ≫ m`）。
- 旧字段 `formula`（等宽纯文本）只为兼容未修订的课程而保留，新内容不要再用。
- KaTeX 放在 `zh/ai/vendor/katex/`，测试会检查公式全部能编译。

### 配图

- 只在图比文字更能说明问题时加：架构图、流程或时序图、硬件结构、讲义里的关键实验曲线。不加装饰图，也不加和交互图示重复的图。每讲 0–3 张。
- 图必须放在本站 `zh/<课程>/figures/`，不能外链。格式用 webp，宽度不超过 1200px，单张尽量不超过 150 KB。
- PDF 讲义：用 `pdftoppm -f N -l N -r 120 -png` 渲染该页，再用 `magick` 裁掉标题栏和页脚，只留图本身。
- 讲稿仓库里讲师自己的图可以下载，并登记到 `sources.json`（`type: "figure"`）。第三方网站的图不要下载。
- 每张图都要写 `alt`（图里画了什么）、`caption`（读图要看什么）和 `source`（出处）。测试会检查这三项都有，并且文件存在。

### 出处（`source`）

`source` 的写法是 `<讲义名> · p.<页码>（<讲义里的小节名>）`：
- 一段跨越多个小节标题时，用 ` / ` 连接，例如 `Lecture 4 (2026) · p.41–66（PPO computes advantages / PPO prevents large updates）`
- 讲稿是 `.py` 文件时，写函数名，例如 `lecture_06.py · triton_softmax()`
- 引用考试题时写清楚，例如 `Midterm (2026) · II.5`
- 往年讲义要写年份，例如 `Lecture 8 (2025) · p.157（pass^k）`
- 不连续的页码用逗号分隔，例如 `p.18, 22, 24`
- 一段引用多份文件时用 `；` 分隔，例如 `cs229-notes3 · p.1–13；cs229-cvxopt · p.7–11`
- **页码一律用 PDF 的页序**（第几页文件页，也就是 `#page=` 用的数字），不用幻灯片角上印的编号；两者可能差 1
- `.pptx` 没有 `#page=` 锚点，写幻灯片序号，例如 `Section 1 (2025) · 幻灯片 18–22`
- 引用代码文件写函数和行号，例如 `train.py · train()（第 40–72 行）`
- 引用考试题写题号；有官方答案时可以附上答案页，例如 `Midterm (2024) · Q5（答案 Solutions p.6）`
- 引用作业、官方代码仓库时写清楚位置，例如 `HW1 讲义 · Problem 7`、`lecture5-frameworks · lecture5.ipynb · Part 1`
- 讲义未发布、只能依据课表和阅读材料的讲次，例如 `课表 · 2026-11-09 条目`、`阅读材料 · Zheng et al. 2023 §3`；嘉宾讲座注明讲者，例如 `Guest lecture slides（讲者姓名）· p.12`

`resources` 链接 PDF 讲义时带 `#page=` 锚点；`.py` 讲稿没有页码，链接源码或官方 trace 页即可。

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

代码在隔离的 iframe + worker 里运行，1 秒超时，不能联网。测试会在 Node 的 `vm` 里再跑一遍，只提供 `console`：**不要用** `TextEncoder`、`fetch`、`setTimeout`、DOM 等全局对象，需要时自己实现（例如手写 UTF-8 编码）。只能写纯 JS，不能用 PyTorch / NumPy。

## 数值校验（`scripts/oracles/<课程>.mjs`）

每个带 `visual` 或 `codeDemo` 的讲次都要有一段 `mark('<id>')`，用**独立推导出的数值**核对 `metrics(...)` 和 `logged(...)`，不能复用被测代码。没有模块的讲次不要 `mark`。

"独立"的优先顺序：
1. 讲义上印出来的数字
2. 闭式解或手算结果
3. 用另一种语言（例如 Python）单独重新实现、算出数值后**写死**在 oracle 里

不能在 oracle 里 `import` 或复制 labs 里的函数。
