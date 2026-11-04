# ZO-RECALL

独立英语词汇学习网站。原生 HTML / CSS / JavaScript，JSON 词库，浏览器本地进度；不依赖账号或服务端。

## 使用

- GitHub Pages：`https://starseaship.github.io/ZO-RECALL/`
- 当前词库：`https://starseaship.github.io/ZO-RECALL/?drafts=1`
- 页面：总览、背单词、英文释义四选一、复习、词库。

## 当前词库

**托业 → 不背单词 → BB1**：用户提供的五张截图，去重后 79 个词头，按词性分为 86 个词条、96 个义项。保持截图顺序。BB1 是用户自定分组，不是 CEFR 难度。

原 10 个测试词条已从词库移除；barely 也在新清单里，所以保留稳定 ID `barely-adv` 后归入 BB1。旧测试文件已删除，现用 `data/toeic-bubei-bb1.json`。

词库、来源、分组是独立三级字段。首页提供分组入口；词库、背词和四选一支持联动筛选。一个词条可以属于多个分组，内容和进度仍只保存一份。

整理稿标记为 `needs-check`；当前入口包含 `?drafts=1`，可直接学习待核查内容。已核查模式只加载 `reviewed`，请勿把机器整理等同于已完成人工校对。首批音标已参考 Cambridge 核对美式发音，来源记录在 `pronunciation`。CEFR 等级为项目估计，与 BB1 编号无关。

所有英文释义均有完整中文翻译，每条例句均有中文。新增词条规则与完整示例见 [WORD_FORMAT.md](WORD_FORMAT.md)。

## 本地运行

```bash
python3 -m http.server 8000
```

打开 `http://localhost:8000/?drafts=1`。不能用 `file://` 直接打开，JSON 需要 HTTP fetch。

需要 Node.js 22+ 运行检查，无 npm 依赖：

```bash
npm run check
npm run build
```

`check` 执行词库校验与核心逻辑测试；`build` 只将网站页面、资源、JSON 和 `.nojekyll` 复制到 `dist/`，不把测试、文档或开发配置部署到网站。

## 发布

推送 `main` 后，Actions 先检查词库与逻辑，再部署到 GitHub Pages。初次部署若提示 Pages 未启用，在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，随后重新运行 **Deploy GitHub Pages**。无需添加令牌或环境变量。

所有应用资源和导航都使用相对路径，支持 `/ZO-RECALL/` 项目子目录。生产站点完全独立于 `all_learn_html`；不修改或引用其代码、词库和页面。

## 数据维护

1. 在 manifest 登记的 JSON 词库中新增词条；永久 `id` 与 `senseId` 不随文本修改。
2. 新文件登记到 `data/manifest.json`；分类和分组 ID 必须存在于 manifest。按 `exam` → `source` → `batch` 组织分组，词条用 `collectionIds` 关联，顺序用 `wordOrder` 记录。
3. 为新增词条写原创建议释义、`definitionZh`（英文释义的完整中文翻译）、中文义项、含目标词的双语例句；搭配例句的 `exampleEn` 需配对 `exampleZh`。先标 `draft` / `needs-check`。
4. 易混词录入 `confusables`；题库会进行双向排除，同时检查选项之间的冲突。可通过 `distractorSenseIds` 指定优先干扰项，但不绕过难度和安全过滤。
5. `definitionForbidden` 记录需要禁止在定义中出现的同源词，如 rarely → rare。自动校验可识别词头和已登记词族，无法穷尽所有语言学同源关系，仍需人工核查。可选的 `equivalenceGroup` 可标记已知同义义项，避免共同出题。
6. 多义词每个义项必须有 `senseHintEn`；有多义项时出题按义项区分。
7. 运行 `npm run check`，人工校对后才改为 `reviewed`；递增 `dataVersion` 后提交。只改 JSON 即可扩词。

运行时会逐条跳过无效词条，重复词 ID / 义项 ID 涉及的词条全部排除，缺失的干扰项引用被忽略并提示。单个文件读取失败不会使其他文件失效，全部读取失败显示错误页。

## 学习记录

- `evl_progress_v2` 保存词条与义项进度；`evl_language` 保存语言选择。
- 自评与测验分开。自评“认识”不产生掌握状态。
- 最近连续答对 3 次，且这 3 次分布在至少两个日本日期，才算该义项已掌握；答错立即撤销。一个词的全部义项掌握才在词级显示已掌握。
- 自评不认识 / 模糊，以及最近答错的义项进入待复习；收藏词也出现在复习页。复习学习卡中不熟悉的义项会重复出现，并优先排入靠前位置。
- 间隔复习 `dueAt` 保留字段，首版未启用。
- 导出 JSON 可备份；导入支持合并与覆盖，校验后才变更当前记录。合并按义项较新时间选择有顺序意义的状态，累计次数取较大值；连对次数保持较新状态，避免旧备份恢复已被新答错撤销的掌握状态。
- 未知或已删除词条/义项导入时忽略并提示。备份大小上限 5 MB。
- 今日统计和连续答题日期按 `Asia/Tokyo`；无账号，不做跨设备自动同步。

**请定期导出。** 进度只在当前浏览器，清理网站数据或 Safari 存储回收可能导致丢失。可尝试“请求保留浏览器数据”，并在 iPhone Safari 使用“添加到主屏幕”；这些操作都不能代替备份。同账号 GitHub Pages 项目共享浏览器源，`evl_` 前缀只避免命名冲突，不提供安全隔离。

## 测验

Easy 使用不同词性或等级差距至少 2 档的干扰项；Normal 要求同词性；Hard 还要求等级相差不超过 1 档。人工指定干扰项优先。相同词头（包括不同词性）、易混词（双向）、高文本重合、同义组、重复选项均会过滤；干扰项之间也要互相兼容。

题目与干扰项均在当前选定分组内产生，错题或收藏范围只限制题目，干扰项仍可使用本组其他义项。不能找到三个合格干扰项时跳过该题并说明原因。程序过滤不能证明任意新词库的语义唯一性，内容发布仍须人工检查。

发音使用系统 `speechSynthesis`，语音质量依赖系统；不可用时提示，不中断学习。界面适配手机竖屏、支持键盘和减少动态效果。

## 需求

原始需求保留在 [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md)；后续确定的词条与分组规则以 [WORD_FORMAT.md](WORD_FORMAT.md) 为准。界面使用已选定的词汇手账排版，保留完整中英对照，不再做内部多层折叠。未实现的后续项：云同步、账号、间隔复习、多词并排对比视图。
