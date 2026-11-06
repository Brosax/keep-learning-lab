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
```

浏览器中的新课程进度和笔记默认保存在本机 `localStorage`。原站已有 Google/Neon 同步功能保持原样；新课程阅读器未接入登录同步。交互实验是简化的教学模型，不调用任何付费 API。

### 来源与许可

新增中文导学与原创交互代码沿用本项目的 CC BY-NC-SA 4.0。下载的 Stanford、讲师或第三方课件、代码与作业 **不因归档而改用本项目许可**，仍按各原作者的版权、许可及课程要求使用。原始课件未翻译、未修改内容。视频保留原始链接；需要校内身份、Canvas、Coursera 或其他授权的材料未绕过限制下载。公开历年资料与当期资料分别标注。

当前整理范围：5 门课程、85 讲中文导学、170 道自测、153 份站内可下载文件（含课件、复习资料、源代码和补充阅读）。另有大型官方仓库原始包保留源站下载入口。CS329Z 与 CME295 尚未发布的后续课件明确标为社区预习。
