# 图片资产索引

## 原始参考图

`pic/` 中保留 15 张用户提供的白天/夜晚山田人物参考图，未改名、未删除。

`assets/ui-history/input-references/` 中迁入了原任务临时目录里的 3 张关键参考图：

| 文件 | 用途 |
| --- | --- |
| `lighting-contrast-reference.png` | 最终人物明暗与背景压暗参考 |
| `pose-expression-reference.png` | 倚门、歪头半笑、夹烟、插袋和交叉腿姿势参考 |
| `face-outfit-hair-reference.png` | 脸型、酒红短发、红瞳、皮衣、浅色裙、黑丝袜与白靴参考 |

## 历史生成图

路径：`assets/ui-history/generated/`

| 序号 | 文件 | 阶段/说明 |
| ---: | --- | --- |
| 01 | `01-maomao-apothecary-concept.png` | 猫猫药师工坊方向探索 |
| 02 | `02-momo-neon-concept.png` | 绫濑桃霓虹灵异方向探索 |
| 03 | `03-emilia-ice-concept.png` | 艾米莉亚冰晶方向探索 |
| 04 | `04-yamada-initial-ui-concept.png` | 山田夜班主题初版桌面 UI |
| 05 | `05-yamada-red-hair-correction.png` | 红发与皮衣造型修正版 |
| 06 | `06-yamada-anime-candidate-a.png` | 纯人物动画候选 A |
| 07 | `07-yamada-anime-candidate-b.png` | 纯人物动画候选 B |
| 08 | `08-yamada-anime-candidate-c.png` | 纯人物动画候选 C |
| 09 | `09-yamada-photoreal-day-a.png` | 真人影视感白天候选 A |
| 10 | `10-yamada-photoreal-day-b.png` | 真人影视感白天候选 B |
| 11 | `11-yamada-photoreal-night-c.png` | 真人影视感夜晚候选 C |
| 12 | `12-yamada-photoreal-night-d.png` | 真人影视感夜晚候选 D |
| 13 | `13-yamada-day-desktop.png` | 白天桌面概念图 |
| 14 | `14-yamada-night-desktop.png` | 夜间桌面概念图 |
| 15 | `15-yamada-adaptive-day-night.png` | 昼夜人格切换桌面概念图 |
| 16 | `16-yamada-composited-pose.png` | 姿势与人物身份合成版本 |
| 17 | `17-yamada-full-width-background.png` | 移除人物右栏、扩展全宽开发区版本 |
| 18 | `18-yamada-final-lighting.png` | 人物提亮、背景局部压暗的最新版本 |

## 最终实现素材

路径：`assets/final/`

| 文件 | 用途 |
| --- | --- |
| `yamada-night-shift-character-v1.png` | 透明背景全身人物母版（真实 alpha） |
| `yamada-night-shift-background-v1.png` | 16:9 深夜服务巷背景母版 |

运行时压缩副本位于 `yamada-night-shift/assets/`，构建时以 data URI 写入 `lib/client.js`，不产生远程图片请求。

## 真实运行预览

路径：`yamada-night-shift/preview/`

| 文件 | 用途 |
| --- | --- |
| `dark.webp` | macOS DSH Desktop 欢迎页全身构图 |
| `chat.webp` | macOS DSH Desktop 活跃对话页缩小构图 |

卸载还原证据位于 `docs/verification/native-restore.webp`，记录真实 DSH Desktop 重启后的官方原生界面。

相册背景功能验收证据也位于 `docs/verification/`：

| 文件 | 用途 |
| --- | --- |
| `album-background-selected.jpeg` | 相册打开时 `sample-6.svg` 显示“当前背景” |
| `album-background-cold-start.jpeg` | Desktop 随机端口冷启动后、打开相册前自动恢复紫色背景 |
| `album-background-reset.jpeg` | 点击“恢复默认背景”后即时返回山田内置夜景 |
| `album-png-jpg-picker.jpeg` | Finder 直接导入 JPG 后即时换背景，图库同时显示已导入 PNG/JPG |

`photo-album/assets/samples/` 另包含用于格式验收的真实栅格示例：`sample-1.png`（600×450）和 `sample-2.jpg`（1200×900）。它们由原有抽象 SVG 示例等价栅格化，不引入新的第三方图片。

## 推荐阅读顺序

最终实现采用 `18-yamada-final-lighting.png` 的明暗关系和 `17-yamada-full-width-background.png` 的布局原则，但根据确认范围只发布 Night 版本。`01`–`16` 是方向和人物探索记录，不代表最终选择。

## 完整性

- 原项目 UI 相关历史生成图：18/18 已迁移。
- 原任务仍存在的关键临时输入图：3/3 已迁移。
- 当前项目已有 `pic` 参考图：15/15 保留。
- 最终人物/背景 PNG 母版：2/2。
- 插件运行时 WebP：2/2。
- 真实 DSH Desktop WebP 预览：2/2。
- 卸载还原证据 WebP：1/1。
- 相册背景选择 / 冷启动 / 恢复证据 JPEG：3/3。
- 相册 PNG/JPG 文件选择器证据 JPEG：1/1。
- 相册真实 PNG/JPG 示例：2/2。
- 仓库当前合计：49 张位图文件；迁移资产与最终产出均已保存在当前项目。
