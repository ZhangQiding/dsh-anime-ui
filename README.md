# dsh-yamada-night-shift · 山田的夜班

为 [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) 制作的夜间动漫风 UI 皮肤。它只改变展示层：欢迎页保留山田全身构图，进入对话后人物缩至右侧约 `56vh`，同时保留 DSH 原生会话、文件、设置、工具与模型交互。

> Night-only anime presentation skin for DeepSeek Harness Web and macOS Desktop. It preserves the native product surface while moving the character from a full-body welcome composition to a conversation-safe right-side placement.

![山田的夜班欢迎页](yamada-night-shift/preview/dark.webp)

![山田的夜班对话页](yamada-night-shift/preview/chat.webp)

## 特性 / Highlights

- 夜间专用的酒红、琥珀和霓虹青配色 / Night-only burgundy, amber, and teal palette.
- 欢迎页全身人物；对话页约 `56vh` / Full-body welcome composition; compact active-chat composition.
- 保留真实 DSH DOM、文案和交互，不伪造功能面板 / Native DSH structure, copy, and behavior stay intact.
- 纯 client presentation skin；不注入模型服务，不发送额外事件 / Presentation-only client plugin; no model-service injection or extra Cordis events.
- 图片以 WebP data URI 编入 `lib/client.js`，运行时无远程素材依赖 / Runtime artwork is embedded; no remote asset dependency.
- 支持 DSH Web 与 macOS DSH Desktop / Supports DSH Web and DSH Desktop on macOS.
- 可重复激活，销毁时恢复 title、favicon、theme color、DOM 和 body 属性 / Idempotent activation and complete teardown.

## 安装 / Install

先通过 GitHub 的 **Code → Clone/Download ZIP** 获取本仓库，并进入仓库根目录。

Get this repository through GitHub's **Code → Clone/Download ZIP**, then open
the repository root in a terminal.

DSH Web：

```sh
dsh plugin --profile web add "$PWD/yamada-night-shift"
```

macOS DSH Desktop（已将 `dsh` 安装到 PATH 时）：

```sh
dsh plugin --profile desktop add "$PWD/yamada-night-shift"
```

如果只安装了 `DSH Desktop.app`，可使用应用内置 CLI：

```sh
ELECTRON_RUN_AS_NODE=1 \
  '/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop' \
  --expose-internals \
  '/Applications/DSH Desktop.app/Contents/Resources/app.asar.unpacked/lib/desktop-cli.js' \
  plugin --profile desktop add "$PWD/yamada-night-shift"
```

首次注册插件后重启对应 DSH 实例。已注册的本地链接会直接读取本仓库的 `lib/`；DSH Web 重新构建后刷新页面即可看到更新。macOS DSH Desktop 2.0.1 的打包版在切换皮肤或重新构建后需要退出并重新打开应用，才能重建 client boot graph。

Restart the target DSH instance after first registration. A linked local install reads the committed `lib/` bundle directly. Refresh DSH Web after rebuilding. Packaged macOS DSH Desktop 2.0.1 must be quit and reopened after switching skins or rebuilding so that it recreates the client boot graph.

## 切换与卸载 / Switch and uninstall

皮肤插件 id 为 `ui-skin-yamada-night-shift`。和其他皮肤切换时，只启用一个 skin：

```yaml
- id: ui-skin-yamada-night-shift
  disabled: false
```

将该行改为 `disabled: true` 即停用。若同时使用 DSH home 层和 profile 层 patch，请同步修改两处的山田条目；其他皮肤的互斥条目只放在安装了它们的 profile patch 中，避免全局层影响 Web/Desktop 之外的 profile。DSH Web 在配置 watcher 更新 boot graph 后刷新页面；macOS DSH Desktop 2.0.1 切换后退出并重新打开应用。

卸载：

```sh
dsh plugin --profile web remove @dsh-external/dsh-client-ui-skin-yamada-night-shift
dsh plugin --profile desktop remove @dsh-external/dsh-client-ui-skin-yamada-night-shift
```

使用 Desktop 内置 CLI 时，把上述 `dsh` 前缀替换为安装示例中的 Desktop 命令前缀。卸载后重启目标实例。

Set `disabled: true` to deactivate the skin. If both DSH-home and profile patch layers exist, update the Yamada row in both. Refresh DSH Web after its config watcher updates the boot graph. Quit and reopen packaged macOS DSH Desktop 2.0.1 after every skin switch. Remove the package with the commands above and restart the target instance.

## 开发 / Development

需要 Node.js 22 或更高版本。

```sh
cd yamada-night-shift
npm install
npm run build
npm test
```

构建流程会先把 `assets/*.webp` 嵌入 `src/client/background-art.generated.ts`，再生成已提交的 `lib/`。提交前建议执行：

```sh
npm run build
npm test
npm pack --dry-run
```

## 仓库结构 / Repository layout

```text
assets/
  final/                 最终生成的 PNG 原图
  ui-history/            从“考试”项目迁移的上下文图片与历史产出
docs/                    迁移记录、资产清单、开发上下文
yamada-night-shift/
  assets/                运行时 WebP 素材
  lib/                   可直接安装的预构建 bundle
  preview/               真实 DSH Desktop 截图
  src/                   插件源码
  tests/                 生命周期与视觉契约测试
```

## 兼容性 / Compatibility

- DSH Web：桌面宽屏和窄屏响应式布局。
- DSH Desktop：macOS；已在 DSH Desktop 2.0.1 上进行本地链接安装和真实界面检查。
- 浅色模式：本皮肤仍保持夜间视觉，这是设计约束，不是自动亮暗双主题。
- 其他操作系统的 DSH Desktop 尚未作为发布目标。

## 来源与许可 / Attribution and license

兼容性脚手架和生命周期结构基于 [Small-tailqwq/dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale) 的 `maid-atelier` 适配。运行时不包含该皮肤的女仆图片。

项目整体以 **CC BY-NC-SA 4.0** 发布：必须署名、禁止商业使用、衍生作品须以相同协议共享。详情见 [LICENSE](yamada-night-shift/LICENSE) 与 [NOTICE](yamada-night-shift/NOTICE)。

The compatibility scaffold and lifecycle shape were adapted from `maid-atelier` in `Small-tailqwq/dsh-deep-whale`. This project is distributed under **CC BY-NC-SA 4.0**: attribution is required, commercial use is prohibited, and adaptations must use the same license.

## 发布前 / Before publishing

建议将 GitHub 仓库命名为 `dsh-yamada-night-shift`。迁移的上下文、图片、预构建 `lib/`、真实预览图与卸载还原证据均已包含，不依赖旧“考试”项目。发布前执行 `npm run build && npm test && npm pack --dry-run`，并保留根目录及包目录中的 `LICENSE` 与 `NOTICE`。

The suggested GitHub repository name is `dsh-yamada-night-shift`. All migrated context, image assets, prebuilt bundles, real previews, and native-restore evidence live in this repository. Before publishing, run `npm run build && npm test && npm pack --dry-run`, and keep both copies of `LICENSE` and `NOTICE` intact.
