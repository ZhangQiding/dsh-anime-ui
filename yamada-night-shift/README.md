# 山田的夜班 / Yamada Night Shift

`@dsh-external/dsh-client-ui-skin-yamada-night-shift` 是面向 DSH Web 与 macOS DSH Desktop 的夜间动漫风展示皮肤。

It is a night-only, presentation-only client skin for DSH Web and DSH Desktop on macOS.

![Welcome view](preview/dark.webp)

![Active conversation](preview/chat.webp)

## 行为 / Behavior

- 欢迎页展示完整人物；对话页自动缩至右侧约 `56vh`。
- 原生会话、文件、设置、工具、模型选择和文案保持不变。
- 所有图片内嵌于预构建 client bundle，运行时不访问远程素材。
- `apply()` 可重复调用；每个 effect 的销毁器只还原自己持有的 DOM、属性、title、favicon 和 theme color。

- Full-body character on the welcome screen; compact right-side character in active chats.
- Native DSH behavior and copy remain untouched.
- All runtime artwork is embedded in the prebuilt client bundle.
- Repeated activation is safe and teardown restores all owned mutations.
- When the optional repository companion `../photo-album/` is installed, a photo selected in its grid or lightbox replaces the night background and persists in plugin-owned DSH Home state. Album state replay plus a bounded route-readiness retry restores it after Desktop cold starts; missing/stale selections fall back to the bundled night scene.

## 安装 / Install

从仓库根目录执行：

```sh
dsh plugin --profile web add "$PWD/yamada-night-shift"
dsh plugin --profile desktop add "$PWD/yamada-night-shift"
```

首次注册后重启对应 DSH 实例。完整的 macOS Desktop 内置 CLI、切换、升级和卸载说明见仓库根目录 README。

Restart the target DSH instance after the first registration. See the repository-level README for the bundled macOS Desktop CLI, switching, upgrade, and uninstall instructions.

## 构建与测试 / Build and test

```sh
npm install
npm run build
npm test
```

Node.js 22+ is recommended. `lib/` is intentionally committed so users can install the skin without compiling it.

## License

CC BY-NC-SA 4.0. See `LICENSE` and `NOTICE`. Attribution is required; commercial use is prohibited; adaptations must use the same license.
