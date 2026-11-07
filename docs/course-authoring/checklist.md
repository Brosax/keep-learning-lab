# 提交前检查清单

## 讲义对齐
- [ ] 每讲 `sections` 的顺序和讲义的 agenda / 小节顺序一致
- [ ] 每个段落都有 `source`（讲义名 + 页码或函数名），并且我打开核对过
- [ ] 没有跨讲预支内容；补充内容都标了"补充："
- [ ] 使用的是老师的例子、记号和术语（英文原词保留）
- [ ] 讲义未公开的讲次写了 `sourceStatus`，没有编造内容
- [ ] `resources` 带 `#page=` 锚点（PDF 页序），指向本讲讲义；`.py` 讲稿链接源码即可
- [ ] 已发布讲义的讲次没有 `sourceStatus`
- [ ] 运行了 `python scripts/sync-lesson-references.py <课程>`
- [ ] 补充的数字标了"补充"；从截图读出来的标了"补充（读图推断）"

## 公式与配图
- [ ] 行间公式用 `math`（TeX），不再用 `formula`；行内公式用 `\(` … `\)`
- [ ] 数字和原文一致；普通数字、单位和代码标识符没有包成公式
- [ ] 配图在 `figures/` 下，有 `alt` / `caption` / `source`，确实比文字更能说明问题
- [ ] 手机宽度下长公式可以横向滚动，图片清晰

## 模块
- [ ] 每个 `visual` / `codeDemo` / `exercise` 都能说出它对应讲义的哪一页
- [ ] 没有为了凑数加模块；去掉的模块已同时从 `labs-*.js` 和 oracle 中删除
- [ ] 交互图示的参数确实会改变结论
- [ ] 代码满足 [module-decision.md](module-decision.md) 里"代码演示的门槛"中的至少一条
- [ ] `experimentScripts` 只列出仍在使用的脚本

## 自测题
- [ ] 每讲至少 2 题、4 个选项，解析说明了错误选项错在哪里（用选项内容指代，不用"选项 B"）
- [ ] 全课程正确答案在 A–D 上大致均衡，没有重复题目
- [ ] 题目和本讲讲义一致
- [ ] 改了题目 → 已更新 `quizRevision`

## 数据稳定
- [ ] 讲次 `id` 和顺序没有变
- [ ] `objectives` 的数量和修订前一致
- [ ] 没有自创 JSON 字段
- [ ] 课程 JSON 设置了 `"lectureAligned": true`

## 构建与测试
- [ ] `python scripts/build-courses.py`
- [ ] `node scripts/test-reviewed-course.mjs <课程>` 通过
- [ ] `node scripts/test-courses.mjs` 和 `python scripts/validate-courses.py` 通过
- [ ] 浏览器检查：有模块的讲次、无模块的讲次、375px 手机宽度
