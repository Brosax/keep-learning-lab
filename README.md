# OpenSEEI · 电子与智能系统开放课程

互动学习笔记：用动画一步一步讲清楚机制，每章配要点、自测和随机数值练习。术语保留西班牙语或英语原文。

在线访问：https://seei-comunidad.vercel.app

- `zh/<课程>/`：中文版（`ei` 智能环境、`micro` 微控制器、`emp` 嵌入式 Linux）
- `en/`、`es/`：翻译中
- `api/progress.js`、`sync.js`：登录后的多端进度同步（Vercel Function）

这是学生自己整理的社区版笔记，不是任何大学或课程的官方资料。页面由生成脚本产生，请不要直接修改；发现错误欢迎提 issue。

内容按 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 共享。

## Stanford AI 学习路径

入口：`/zh/ai/`。新增 CS229、CS230、CME295、CS336、CS329Z 的中文社区导学、来源资料库、实践任务、自测、笔记和本地学习进度。课程内容与原始资料的学期、公开范围以各课说明和 `sources.json` 为准；这不是 Stanford 官方授课或完整课堂录像的替代品。

- `content/<course>.json`：可维护的课程源数据。先编辑这里，再运行生成器。
- `zh/<course>/materials/`：已下载并验证的公开原始资料。
- `zh/<course>/sources.json`：资料来源、下载状态与文件元数据。
- `zh/ai/assets/`：五门课共用的阅读器、样式和交互实验。
- `scripts/build-courses.py`：生成课程网页和首页目录，不访问网络。

```bash
python scripts/build-courses.py
python scripts/validate-courses.py
npm install --prefix /tmp/openseei-qa --cache /tmp/npm-cache linkedom
node scripts/test-courses.mjs
node scripts/test-playground.mjs
node scripts/test-visuals.mjs
node scripts/test-cs229.mjs
node scripts/test-reviewed-course.mjs cs230
node scripts/test-reviewed-course.mjs cme295
```

浏览器中的新课程进度和笔记默认保存在本机 `localStorage`。原站已有 Google/Neon 同步功能保持原样；新课程阅读器未接入登录同步。交互实验是简化的教学模型，不调用任何付费 API。

CS229、CS230 与 CME295 已完成逐章去重修订，分别覆盖 22、18 与 9 讲。每讲有独立数值图解、可编辑代码、完整算例及两道情境自测；共用讲义保留各讲阅读引用。章节通过 `visual` / `codeDemo` 显式绑定本课程实验，缺失配置不会回退到通用演示。新课程用 `experimentScripts` 声明脚本，公共绘图原语在 `zh/ai/assets/lab-core.js`。更新题目时递增 `quizRevision`，仅清除旧答题记录，保留目标进度与笔记。CS336、CS329Z 正在逐门复核。

`test-cs229.mjs` 检查真实生成数据与全部章节绑定、代码去重和执行、独立数值基准、参数边界、切章清理及答题迁移；使用 DOM 模拟和 Node VM，不代替浏览器排版检查。

### 来源与许可

新增中文导学与原创交互代码沿用本项目的 CC BY-NC-SA 4.0。下载的 Stanford、讲师或第三方课件、代码与作业 **不因归档而改用本项目许可**，仍按各原作者的版权、许可及课程要求使用。原始课件未翻译、未修改内容。视频保留原始链接；需要校内身份、Canvas、Coursera 或其他授权的材料未绕过限制下载。公开历年资料与当期资料分别标注。

当前整理范围：5 门课程、85 讲中文导学、170 道自测、157 份站内可下载文件（含课件、复习资料、源代码和补充阅读）。另有大型官方仓库原始包保留源站下载入口。CS329Z 与 CME295 尚未发布的后续课件明确标为社区预习。

## 主页

主页分为课程、精选文章与交互实验三个入口，默认显示 6 门课程，可分类、搜索及展开全部。精选文章链接到现有课程笔记。学习记录、备份与账号同步位于独立面板；现有课程均纳入本地备份；西班牙语课程的本地记录单独保留，不接入账号云端同步。

`index.html` 保留 `catalog-data` 数据块供课程生成器更新；主页交互与样式位于 `assets/home.js` 和 `assets/home.css`。运行 `node scripts/test-home.mjs` 检查筛选、搜索、语言、主题、续读与导航。

## 西班牙语语法 · 互动入门

入口：`/zh/spanish-grammar/`。中文讲解的基础语法专项课，包含 8 个模块、16 节短课、96 道选择/填空练习和 16 项表达任务。提供先提示后解析、错题独立重练、表达草稿与自评。它以 A1 基础语法为方向，不代表完整 A1 等级认证。

- `content/spanish-grammar/course.json`：原创例句、规则、题目、答案、反馈与任务。
- `content/spanish-grammar/player.template.html`：课程播放器模板；请编辑源文件再生成。
- `scripts/build-spanish-course.py`：无网络依赖地生成网页、公开 JSON 与 CSV 题库。
- `zh/spanish-grammar/materials/`：教师用书和完整离线课程包；修改教学内容时需同步更新这两份下载资料。

```bash
python scripts/build-spanish-course.py
node scripts/test-home.mjs
# 可选：安装 Python playwright 和 Chromium 后运行浏览器集成检查
python scripts/test-spanish-course.py
```

学习记录使用 `spanish-grammar-course-v1`，保留首次结果、重练记录和表达草稿，并映射到首页进度与续读。首页导入/导出备份包含本课程，但不将其数据传入原有 Google/Neon 云端同步。表达任务采用自评或教师评阅，无自动口语/作文评分。

课程讲解、题目与代码为原创，沿用本站 CC BY-NC-SA 4.0。调研来源列于课程 JSON 和教师用书，不含第三方课程原文或付费资料。
