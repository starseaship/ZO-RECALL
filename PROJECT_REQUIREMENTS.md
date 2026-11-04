# English Vocabulary Lab｜项目需求文档（PRD）

- **版本**：v3.0
- **日期**：2026-11-04
- **状态**：需求确认 / 待开发
- **定位**：独立英语词汇学习网站，包含「背单词」与「英文释义四选一」两种学习方式
- **部署**：独立 GitHub 仓库 + 独立 GitHub Pages 站点
- **与 all_learn_html 的关系**：完全独立。不放进其仓库，不共用代码、词库、首页入口或学习记录。

## 1. 项目目标

围绕同一套 JSON 词库提供两种学习方式：

1. **背单词**：理解英文释义、中文义项、语义侧重点、词根词缀（有可靠依据时）、搭配、使用场景、例句和易混辨析。
2. **英文释义四选一**：显示英文单词，从四个英文释义中选出正确解释，并通过解析巩固理解。

核心原则：用英语理解英语，中文作辅助；内容质量优先于数量；手机竖屏优先；静态部署；新增单词只改 JSON，不改 HTML。

## 2. 技术方案

- **前端**：原生 HTML / CSS / JavaScript，无服务端、无账号，可拆分多文件。
- **词库**：UTF-8 JSON，由 `data/manifest.json` 管理；学习页和测验页共用同一份数据。
- **本地进度**：`localStorage`，按稳定的词条 ID / 义项 ID 保存，键名 `evl_progress_v2`。
- **备份**：导出 / 导入进度 JSON（P0）。不做跨设备自动同步。
- **部署**：GitHub Pages，所有资源使用相对路径，兼容项目子目录。

### 存储风险与对策

- GitHub Pages 的项目站点共用同一个源（`<username>.github.io`），localStorage 按源隔离而非按路径隔离。同账号下的其他站点可读写同一块存储，清除站点数据时会一并清掉。使用 `evl_` 前缀避免键冲突；若需彻底隔离，可改用自定义域名。
- iOS Safari 可能清理长期未访问网站的存储。对策：提供导出备份；尝试调用 `navigator.storage.persist()`；README 建议「添加到主屏幕」。
- 界面需提醒：进度仅保存在当前浏览器，清理网站数据会丢失。

### 目录结构

```text
english-vocabulary-lab/
├── index.html            # 首页 / 学习总览
├── study.html            # 背单词：学习卡片 + 详细词条
├── quiz.html             # 英文释义四选一
├── review.html           # 错题 / 复习
├── library.html          # 词库浏览与搜索
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── data.js       # 词库加载 / 运行时校验
│       ├── study.js
│       ├── quiz.js       # 出题 / 判题
│       ├── progress.js   # 本地进度 / 导入导出
│       └── shared.js     # 通用组件 / 发音
├── data/
│   ├── manifest.json
│   └── words-001.json    # 词库文件按批次存放，分类由 categories 标注
├── scripts/
│   └── validate.mjs      # 词库校验脚本
├── .github/workflows/validate.yml
├── README.md
└── PROJECT_REQUIREMENTS.md
```

## 3. 页面需求

### 3.1 首页

四个入口：开始背单词、英文释义四选一、错题与复习、词库浏览。可显示今日已学、待复习数、已掌握数、测验正确率，不堆复杂图表。

### 3.2 背单词页

**A. 快速学习卡片**（手机优先）

- 显示单词、词性、发音按钮、音标（仅有核对过的数据时）。
- 默认只显示英文核心释义；中文可点击展开；提供「仅英文 / 英中双语」开关并记住选择。
- 自评「不认识 / 有点模糊 / 认识」，支持上一词 / 下一词、收藏。
- 点击「详细解析」展开词条详情。

**B. 详细词条**（可展开，也可从词库进入）

按顺序显示，字段缺失则隐藏该模块：

1. 单词 / 词性 / 发音
2. 核心释义（英文 + 中文）
3. 侧重点：该词强调什么，与宽泛中文翻译的差异
4. 词根词缀：仅在拆分可靠且有助记忆时显示
5. 常见搭配
6. 使用场景：口语 / 书面 / 学术 / 工作 / 日常
7. 例句：自然、符合目标义项，突出关键搭配
8. 近义与易混：只展示核查过的对比
9. 记忆提示（可选）：不可替代准确解释

UX 要求：长内容用折叠小节；默认展开「核心释义」和「侧重点」；避免长篇难滚动。

### 3.3 四选一页

- 题面为英文单词，附词性 / 发音（按设置）；四个英文释义选项，唯一正确。
- 范围：全词库 / 指定分类 / 未掌握 / 收藏 / 错题。
- 难度：
  - **Easy**：干扰项词性不同，或等级差距较大。
  - **Normal**：干扰项同词性，等级不限。
  - **Hard**：同词性、相近等级，优先使用人工指定的干扰项。
- 答题后显示对错、英文释义、中文义项、一个关键侧重点、例句，并提供「查看完整词条」。
- 结束时显示正确率、错题和「复习错题」入口。

### 3.4 复习页

- 汇总答错的词、自评为「不认识 / 有点模糊」的词和收藏词。
- 可切换「看释义背词」或「四选一」；不熟悉的词出现频率更高；支持手动重新学习。
- 状态：见过 / 学习中 / 待复习 / 已掌握（定义见第 6 节），不以「打开过词条」判定掌握。

### 3.5 词库页

- 搜索英文词、中文意思、搭配；按分类、词性、难度、掌握状态筛选。
- 点击进入完整词条，可直接开始相关练习。
- 一个词条只保存一份内容和一份进度，即使属于多个分类。

## 4. 词库数据设计

### 4.1 原则

- 词库与学习记录分开。
- 每个词条有永久 `id`；每个义项有永久 `senseId`。词性不同视为不同词条（如 `light-adj`、`light-noun`）；同词性的多个义项放在同一词条的 `senses` 中，测验按义项判题。
- 扩展字段均为可选，缺失时隐藏对应部分，不显示 `undefined`。
- 文本需经过基本语言准确性检查，避免逐字复制受版权保护的词典内容。
- 文件是存储批次，`categories` 是标签；**一个词条只存在于一个文件**。

### 4.2 `reviewStatus`

| 值 | 含义 | 前端是否加载 |
| --- | --- | --- |
| `draft` | 刚整理，未核查 | 否 |
| `needs-check` | 部分内容待确认 | 否 |
| `reviewed` | 已完成人工校对 | 是 |

仅在完成实际校对后才标为 `reviewed`。开发时可用 URL 参数 `?drafts=1` 预览未审核词条。

### 4.3 词条示例（`rarely`）

```json
{
  "id": "rarely-adv",
  "word": "rarely",
  "partOfSpeech": "adverb",
  "level": "B1",
  "categories": ["Common", "School"],
  "pronunciation": { "ipa": "", "accent": "en-US" },
  "senses": [
    {
      "senseId": "rarely-adv-01",
      "definitionEn": "Not often; on very few occasions.",
      "meaningZh": "很少；难得；罕有",
      "nuanceZh": "强调事情发生的频率很低，通常表示几乎不发生，但并非绝对不发生。",
      "examples": [
        { "en": "I rarely eat fast food.", "zh": "我很少吃快餐。" },
        { "en": "It rarely snows in this city.", "zh": "这座城市很少下雪。" }
      ],
      "collocations": [
        { "phrase": "rarely + verb", "meaningZh": "表示很少做某事", "exampleEn": "She rarely watches TV." }
      ],
      "contexts": [
        { "title": "低频习惯", "noteZh": "描述一个人平时很少做的事情" },
        { "title": "少见现象", "noteZh": "描述很少发生的自然或客观现象" }
      ],
      "confusables": [
        { "word": "seldom", "noteZh": "含义接近 rarely，通常稍偏正式。" },
        { "word": "barely", "noteZh": "侧重“勉强、几乎不”，不表示低发生频率。" }
      ],
      "distractorSenseIds": []
    }
  ],
  "wordFormation": [
    { "part": "rare + -ly", "explanationZh": "由形容词 rare 加副词后缀 -ly 构成。" }
  ],
  "memoryHintZh": "rare 表示稀少的；rarely 可联想为“很少发生地”。",
  "sourceNote": "释义与例句由项目整理；发布前人工校对",
  "reviewStatus": "reviewed"
}
```

说明：`pronunciation.ipa` 为空表示不显示音标，不填写未核实的音标。首版用浏览器 `speechSynthesis` 发音，质量取决于系统语音，不可用时给出提示且不阻塞学习。

### 4.4 字段映射

| 页面模块 | 字段 |
| --- | --- |
| 单词与词性 | `word`, `partOfSpeech` |
| 英文 / 中文释义 | `senses[].definitionEn`, `senses[].meaningZh` |
| 侧重点 | `senses[].nuanceZh` |
| 词根词缀 | `wordFormation` |
| 搭配 / 场景 / 例句 / 易混 | `senses[].collocations` / `contexts` / `examples` / `confusables` |
| 四选一答案 | `senses[].definitionEn` |
| 人工干扰项 | `senses[].distractorSenseIds` |

### 4.5 `data/manifest.json`

```json
{
  "schemaVersion": 2,
  "dataVersion": "2026-11-04.1",
  "categories": ["TOEIC", "School", "Academic", "Common"],
  "files": ["data/words-001.json"]
}
```

- 每次更新词库时递增 `dataVersion`；加载 JSON 时带 `?v=<dataVersion>`，避免 GitHub Pages 缓存（约 10 分钟）导致看到旧数据。
- 本地开发不能用 `file://` 打开（fetch 会失败），README 说明用 `python -m http.server`。

### 4.6 词库校验

`scripts/validate.mjs` 在本地和 GitHub Actions 中运行，至少检查：

- `id`、`senseId` 全局唯一，且一个词条只出现在一个文件。
- `distractorSenseIds` 指向存在的义项。
- 必填字段非空：`word`、`partOfSpeech`、`definitionEn`、`meaningZh`、至少一条例句。
- `definitionEn` 不含词头及其同源词（如 `rarely` 的释义不得含 `rare`）。
- 例句中包含目标词。
- `reviewStatus` 为合法枚举值。

前端运行时对单个词条校验失败只跳过该词条并在控制台提示，不使整站加载失败。

## 5. 四选一出题标准

1. 先确定 `senseId`，再取对应的 `definitionEn` 作为正确项；每题只有一个准确答案。
2. 干扰项优先用人工指定的 `distractorSenseIds`；否则按难度规则从其他词条中选取。
3. 过滤规则：
   - `confusables` 视为**双向黑名单**：A 列出 B，则 A 的题中不出现 B 的释义，B 的题中也不出现 A 的释义。
   - 干扰项释义与正确释义文字高度重合时丢弃。
   - 选项间有重复、同义或可能同时成立的，丢弃。
4. 无法保证唯一正确答案时**跳过该题**；题量不足时提示具体原因，不强行凑题。
5. 多义词在题干加词性或义项提示；选项随机排列；点击后锁定，不可重复计分。
6. 答后解析使用学习页的同一份数据。

## 6. 学习与复习记录

示例（`evl_progress_v2`）：

```json
{
  "schemaVersion": 2,
  "words": {
    "rarely-adv": {
      "favorite": false,
      "lastStudiedAt": "2026-11-04T14:30:00+09:00",
      "senses": {
        "rarely-adv-01": {
          "seenCount": 5,
          "studyRatings": { "unknown": 1, "unsure": 2, "known": 2 },
          "quizCorrect": 3,
          "quizWrong": 1,
          "quizStreak": 2,
          "streakDays": ["2026-11-03", "2026-11-04"],
          "dueAt": null
        }
      }
    }
  }
}
```

状态规则：

- **自评与测验分开记录**：学习页的「认识」只是自评，不等于已掌握。
- **测验已掌握**：连续答对 3 次，且这 3 次分布在至少两个不同日期；之后答错则撤销。界面显示「已掌握」时说明依据。
- **待复习**：最近一次答错，或最近一次自评为「不认识 / 有点模糊」。
- **见过 / 学习中**：打开过但未满足以上条件。
- `dueAt` 为 P2 间隔复习预留，首版不使用。
- 词级统计仅用于汇总；被删除词条的孤立进度导入时忽略并提示。

导出 / 导入：

- 导入前校验 `schemaVersion` 和字段，可选择「合并」或「覆盖」。
- 合并规则：按义项，取 `lastStudiedAt` 较新的一方；计数类字段取较大值。

## 7. 视觉与交互

- 移动端优先（iPhone 竖屏），桌面自适应。
- 干净、轻量，适合长时间背词；英文单词醒目，中文说明清楚。
- 搜索、返回列表、上一词 / 下一词、清晰的学习进度。
- 可访问性：按钮有明确文本、键盘可操作、状态不只靠颜色、尊重「减少动态效果」设置。

## 8. 功能优先级

### P0 — 首版必须完成

- 独立仓库和 GitHub Pages 部署，不改动 `all_learn_html`。
- 首页、背单词页、四选一页、词库页、基础复习页。
- 统一 JSON 词库、`manifest.json`（含 `dataVersion`）、`reviewStatus` 过滤。
- 背词卡片与详细词条；四选一（含第 5 节的过滤规则）；自评、错题和进度保存。
- **进度导出 / 导入**与存储风险提示。
- **词库校验脚本**与 GitHub Action。
- 手机端正常显示；空数据 / 加载失败有明确提示。

### P1 — 紧随首版

- 发音按钮、收藏、未掌握 / 收藏专项练习。
- 搜索与筛选、每日学习统计、英文 / 双语设置记忆。
- 易混词对比视图、更多人工审核的干扰项。

### P2 — 未来

- 基于 `dueAt` 的间隔复习。
- 跨设备账号或云同步（需要额外服务）。

## 9. 词库整理流程

1. 用户提供课程照片、PDF、词汇清单或指定单词。
2. 整理拼写、词性、义项、英文释义和中文说明；补充侧重点、搭配、场景、双语例句、易混对比。
3. 词根词缀只录入可靠的拆解，没有就留空。
4. 运行校验脚本，人工校对后将 `reviewStatus` 标为 `reviewed`，递增 `dataVersion`，提交仓库。

首批做 50–100 个高质量词条，以 `rarely / seldom / barely` 的易混辨析为示范，再扩展到 TOEIC、学校英语和学术词汇。

## 10. 验收标准

- 独立网址可进入全部五个页面；`all_learn_html` 不受影响。
- 词条页正确展示各模块，空字段不影响布局。
- 同一个词在背词页与四选一页的英文释义和例句一致。
- 多义词按义项训练；四选一不出现多个正确答案，也不出现近义词互为干扰项。
- 学习自评与测验成绩分别记录，刷新后可恢复；导出再导入后进度一致。
- 更新 JSON 并递增 `dataVersion` 后，站点加载新词，无需修改界面代码。
- 校验脚本在含错误的词库上能报错并阻止通过。
- 手机端阅读和点击方便，英文优先 / 双语切换正常。
- 语音不可用、JSON 读取失败、没有合格干扰项时均有清晰提示。

## 11. 开发顺序

1. 新建 GitHub 仓库；确定词库 Schema、`manifest.json` 与数据读取逻辑；写校验脚本。
2. 准备一批真实词条，重点校对英文释义和侧重点。
3. 先做背单词页与详细词条，确认字段能完整承载内容。
4. 用同一份 JSON 实现四选一与解析。
5. 加入自评、错题、复习、本地保存与导入导出。
6. 适配手机，测试多义词、发音和各异常状态。
7. 发布到独立 GitHub Pages。

---

**最终定位**：先理解词汇，再用四选一检验理解；内容持续增长，学习记录可备份、长期可用。
