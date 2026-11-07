# 提示词：新增或重做一门课程

把下面整段交给 AI（例如 Claude Code），替换掉 `<…>` 部分即可。AI 需要能读写仓库、运行命令，并且能按页阅读 PDF。

---

你要为 Keep Learning Lab 网站（本仓库）<新增 / 重做>课程 **<课程代号，例如 CME295>**，课程 slug 为 `<slug>`。

**先读这些文件，再动手：**
- `docs/course-authoring/README.md`（流程和原则）
- `docs/course-authoring/lesson-schema.md`（数据格式）
- `docs/course-authoring/module-decision.md`（什么时候加图示、代码、练习）
- `docs/course-authoring/checklist.md`（完成标准）
- 现有数据：`content/<slug>.json`、`zh/<slug>/sources.json`、`zh/<slug>/assets/labs-*.js`、`scripts/oracles/<slug>.mjs`

**原始资料**在 `zh/<slug>/materials/`。

**任务：**

1. **建立讲义大纲。** 逐讲阅读讲义：幻灯片要按页看（抽出来的文字会丢掉图），`.py` 讲稿按函数读，笔记按小节读。先为每一讲写出大纲：小节名、页码范围、老师用的例子和公式。没有讲义的讲次，记下来，后面用 `sourceStatus` 说明。
2. **重写正文。** 按大纲重写每讲的 `title`、`summary`、`objectives`（数量不变）和 `sections`：
   - 顺序跟随讲义，段落数量由讲义决定
   - 每段写上 `source`
   - 用老师的例子和术语，中文讲解，保留英文原词
   - 不跨讲预支内容，不照抄原文
3. **逐讲决定模块。** 按 `module-decision.md` 决定 `visual`、`codeDemo`、`exercise`、`flow`、`table` 和手算例题：
   - 不需要的就删掉，包括 `labs-*.js` 里的注册和 oracle 里的 `mark`
   - 需要的就重写，让它对应讲义内容
   - 不同讲次的模块组合**可以不一样**
4. **自测题。** 已有题目保留；只有和讲义矛盾，或者考的是本讲讲义没讲的内容时才修改，修改后要更新 `quizRevision`。全课程正确答案的位置要均衡。
5. **收尾。** 在课程 JSON 里设置 `"lectureAligned": true`，然后运行以下命令，全部通过：
   - `python scripts/sync-lesson-references.py <slug>`
   - `python scripts/build-courses.py`
   - `node scripts/test-reviewed-course.mjs <slug>`
   - `node scripts/test-courses.mjs`
   - `python scripts/validate-courses.py`
6. **浏览器检查。** 用 `python -m http.server` 打开以下页面，确认没有横向溢出：
   - 一讲有模块的
   - 一讲没有模块的
   - 一讲有 `sourceStatus` 的
   - 手机宽度 375px

**硬性约束：**
- 讲次 `id` 和顺序不变，`objectives` 数量和修订前一致
- 不自创 JSON 字段
- 不要编造讲义里没有的"老师观点"；没有资料就明说
- 不修改其他课程的文件，也不修改共享渲染器 `zh/ai/assets/*`（如果确实需要，先说明理由）
- 不提交、不推送，除非被明确要求

**交付时报告：**
- 每讲一行：讲义出处、保留或新增了哪些模块、理由
- 哪些讲次没有讲义
- 测试结果
