# 词库写入规则

本文件为当前维护规则；原始 PRD 中较早的示例仅作历史参考。

## 分级

当前路径为 **托业 → 不背单词 → BB1**。

| 层级 | manifest 字段 | 当前值 |
| --- | --- | --- |
| 词库/考试 | `exam` | `托业` |
| 来源 | `source` | `不背单词` |
| 批次/分组 | `batch` | `BB1` |
| 分组永久 ID | `id` | `toeic-bubei-bb1` |

`BB1` 是分组编号，与词条的 `level`（A1–C2，项目估计）无关。新增 BB2 时新增一个 collection，不改 BB1 的 ID。

```json
{
  "id": "toeic-bubei-bb1",
  "exam": "托业",
  "source": "不背单词",
  "batch": "BB1",
  "wordOrder": ["prompt-adj", "prompt-verb", "complimentary-adj"]
}
```

上例只展示顺序字段的写法；实际 `wordOrder` 包含本组全部词条。

词条用 `"collectionIds": ["toeic-bubei-bb1"]` 关联分组。同一个词条可关联多个分组，不复制内容，也不另建一份进度。

## 必填内容

- 词条：`id`、`word`、`partOfSpeech`、`categories`、`collectionIds`、`reviewStatus`、至少一个 `senses`。
- 义项：永久 `senseId`、英文释义 `definitionEn`、完整中文翻译 `definitionZh`、简短义项 `meaningZh`、至少一条例句 `examples`。
- 例句：每条都有 `en` 与 `zh`，英文包含目标词原形。不要只写搭配的翻译而遗漏句子翻译。
- 如果搭配提供 `exampleEn`，必须同时提供 `exampleZh`；也可只写搭配与释义，再用下方双语例句展示用法。
- 多义词的每个义项都要有 `senseHintEn`，避免测验题干含糊。

`definitionZh` 是完整英文定义的翻译；`meaningZh` 是短义项，两者不可混淆。

词性不同分成不同词条，例如 `prompt-adj` 和 `prompt-verb`。同词性的不同义项放在同一词条中。不要为同一词因属于不同分组重复建词条。

## 发音与扩展内容

- 音标位于 `pronunciation.ipa`，不加两侧斜线；由界面统一显示斜线。
- 当前使用美式 `accent: "en-US"`。核对后记录 `sourceUrl` 与 `verifiedAt`，注意同词不同词性可能有不同重音和读法。
- 未核实的音标留空，禁止凭拆字编写。
- 侧重点 `nuanceZh`、搭配 `collocations`、场景 `contexts`、易混辨析 `confusables` 按实际内容补充。
- 词根词缀 `wordFormation` 只写有可靠依据且有记忆价值的拆解，不为了填满页面而硬拆。
- `definitionForbidden` 可补充不得出现在释义中的同源词；自动脚本无法识别全部同源关系，需内容核查。
- 释义和例句使用项目原创整理文本，不逐字搬运第三方词典条目。

## 完整示例

```json
{
  "id": "prompt-adj",
  "word": "prompt",
  "partOfSpeech": "adjective",
  "level": "B2",
  "categories": ["托业"],
  "collectionIds": ["toeic-bubei-bb1"],
  "pronunciation": {
    "ipa": "prɑːmpt",
    "accent": "en-US",
    "sourceUrl": "https://dictionary.cambridge.org/pronunciation/english/prompt",
    "verifiedAt": "2026-11-04"
  },
  "senses": [
    {
      "senseId": "prompt-adj-01",
      "definitionEn": "Done quickly and without unnecessary delay.",
      "definitionZh": "迅速完成且没有不必要的延误。",
      "meaningZh": "迅速的；及时的",
      "nuanceZh": "强调回应或行动来得及时，不一定表示做事速度始终很快。",
      "examples": [
        {
          "en": "Thank you for your prompt response to my email.",
          "zh": "感谢你及时回复我的邮件。"
        }
      ],
      "collocations": [
        { "phrase": "prompt response", "meaningZh": "及时回复" }
      ],
      "contexts": [
        { "title": "商务沟通", "noteZh": "用于回复、付款和服务的及时性。" }
      ],
      "confusables": [
        { "word": "quick", "noteZh": "quick 范围更广；prompt 常强调没有耽搁地及时回应。" }
      ],
      "distractorSenseIds": []
    }
  ],
  "sourceNote": "词头来自用户提供的清单；释义、翻译和例句为原创整理稿，待内容核查。",
  "reviewStatus": "needs-check"
}
```

## 新增批次的步骤

1. 整理词头并去重，确定词性和义项。已有词条直接复用永久 ID，必要时添加义项，不复制词条。
2. 新词可存入新的 JSON 文件，并在 `manifest.files` 登记；文件名不等于分组关系。
3. 在 `manifest.collections` 新增分组，写好 `exam`、`source`、`batch`、`wordOrder`。
4. 更新相关词条的 `collectionIds`；多个分组引用同一词条时只保存一份内容。
5. 初稿用 `draft` 或 `needs-check`，内容实际完成人工核查后才用 `reviewed`。当前学习入口 `?drafts=1` 可查看待核查内容，已核查模式保持过滤。
6. 每次更新词库递增 `dataVersion`，运行 `npm run check`，通过后提交。无需修改 HTML。

## 校验与出题

脚本检查词条/义项 ID 唯一、必填内容、双语例句、分组与顺序引用、人工干扰项引用、词头和已登记同源词。新词更新不能破坏旧 ID 对应的学习记录。

易混词是双向排除；同一词头不同词性也不会互作干扰项。无法找到三个合格干扰项时会跳过题目，不以近义或可能同时成立的释义凑题。
