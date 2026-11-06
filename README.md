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
```

浏览器中的新课程进度和笔记默认保存在本机 `localStorage`。原站已有 Google/Neon 同步功能保持原样；新课程阅读器未接入登录同步。交互实验是简化的教学模型，不调用任何付费 API。

CS229 已完成逐章去重修订：22 讲各有独立的数值图解、可编辑代码和手算例题，44 道情境自测；原始讲义共用同一文件时标明对应阅读页码。章节通过 `visual` / `codeDemo` 显式绑定 `zh/cs229/assets/` 中的实验，缺失配置不会回退到通用回归演示。更新题目时递增 `quizRevision`，仅清除旧答题记录，保留目标进度与笔记。其他课程尚未按此标准逐章复核。

`test-cs229.mjs` 检查真实生成数据与全部章节绑定、代码去重和执行、独立数值基准、参数边界、切章清理及答题迁移；使用 DOM 模拟和 Node VM，不代替浏览器排版检查。

### 来源与许可

新增中文导学与原创交互代码沿用本项目的 CC BY-NC-SA 4.0。下载的 Stanford、讲师或第三方课件、代码与作业 **不因归档而改用本项目许可**，仍按各原作者的版权、许可及课程要求使用。原始课件未翻译、未修改内容。视频保留原始链接；需要校内身份、Canvas、Coursera 或其他授权的材料未绕过限制下载。公开历年资料与当期资料分别标注。

当前整理范围：5 门课程、85 讲中文导学、170 道自测、153 份站内可下载文件（含课件、复习资料、源代码和补充阅读）。另有大型官方仓库原始包保留源站下载入口。CS329Z 与 CME295 尚未发布的后续课件明确标为社区预习。

## 主页

主页分为课程、精选文章与交互实验三个入口，默认显示 6 门课程，可分类、搜索及展开全部。精选文章链接到现有课程笔记。学习记录、备份与账号同步位于独立面板；所有 8 门课程均纳入备份。

`index.html` 保留 `catalog-data` 数据块供课程生成器更新；主页交互与样式位于 `assets/home.js` 和 `assets/home.css`。运行 `node scripts/test-home.mjs` 检查筛选、搜索、语言、主题、续读与导航。
