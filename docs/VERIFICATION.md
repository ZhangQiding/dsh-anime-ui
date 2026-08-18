# 发布验收记录

验证日期：2026-08-18
目标包：`@dsh-external/dsh-client-ui-skin-yamada-night-shift@0.0.1`

## 已通过

| 验收项 | 证据 |
| --- | --- |
| 迁移完整性 | `pic/` 15 张、`assets/ui-history/generated/` 18 张、`assets/ui-history/input-references/` 3 张均在当前仓库；包含最终 PNG、运行时 WebP、真实预览和卸载证据共 43 张图片文件。 |
| 插件结构 | `skin.json`、`cordis.patch.yml`、`dsh.client`、`lib/index.js`、`lib/client.js`、LICENSE、NOTICE 均存在。 |
| 构建 | Node 24 环境执行 `npm run build` 成功；`lib/client.js` 为 307,766 bytes。 |
| 生命周期 | Vitest 20/20 通过，覆盖 scope lease、重复/重叠激活、异步 DOM、状态投影、CSSOM 失败、resize、title/favicon/theme-color/body/owned-node 还原。 |
| 发布包 | `npm pack --dry-run` 通过：25 个文件，tarball 755.9 kB，unpacked 976.0 kB。 |
| 远程素材 | 源码测试与真实服务 bundle 检查均仅发现两处 `data:image/webp;base64,`；唯一 `http://` 是 SVG XML namespace。 |
| DSH Web 注册 | Web profile `--dump-config` 显示 `ui-skin-yamada-night-shift`、正确包名、`disabled: false`，无缺失 patch 条目警告。 |
| DSH Web 运行时 | 临时真实 DSH Web 启动于 loopback 随机端口；`window.__DSH_BOOT__.entries` 包含山田包。实际 HTTP 提供的 client bundle 与仓库 `lib/client.js` 均为 307,766 bytes，SHA-256 同为 `0099df1e278b8b88aaf8ca4fbfce773ff2432fc32f5526741ef092a0cd3ead0d`。 |
| Desktop 本地链接 | Desktop profile 的 package graph 与 symlink 指向当前仓库 `yamada-night-shift/`。实际执行 remove 后 package graph 清除，再执行 add 后成功恢复。 |
| Desktop 卸载还原 | 再次实际 remove 后，真实退出并重开 DSH Desktop；窗口标题为 `DeepSeek Harness`，原生背景恢复且无山田人物/头像/颜色。相同 Desktop profile 的 DOM 核验中，`data-dsh-yamada-night-shift`、全部 `data-yamada-*`、owned DOM、人物、favicon、style 和 body 背景均为 0/空。证据图：`docs/verification/native-restore.webp`。随后已重新 add、再次重开并恢复“山田的夜班”最终界面。 |
| Desktop 视觉 | 真实 DSH Desktop 已检查欢迎页全身构图和活跃对话约 `56vh` 构图；截图在 `yamada-night-shift/preview/dark.webp` 与 `chat.webp`。原生侧栏、会话、composer 和文件面板保持可用。 |
| Desktop 响应式构图 | 同一 Desktop 本地服务的真实 DOM 计算：1280×720 欢迎页人物 655.2px（91vh、opacity 0.96）；活跃对话人物 403.2px（56vh、opacity 0.76、`pointer-events: none`），owned DOM 稳定为 7。 |
| Desktop 最终安装状态 | 发布收尾时发现旧测试窗口仍持有内存状态、磁盘 `desktop` profile 已不在原位；未沿用该弱证据。随后使用 Desktop 官方内置 CLI 重新初始化 `~/.dsh/profiles/desktop` 并执行本地链接安装。`package.json` 仅加入山田皮肤，symlink 指向当前仓库，`--dump-config` 包含启用的 `ui-skin-yamada-night-shift`。真实退出并重新打开后服务端口由 `53828` 变为 `55124`，窗口仍显示山田标题、欢迎页全身人物；打开既有会话后人物缩至右下安全区。新进程的实际 `window.__DSH_BOOT__.entries` 包含 `@dsh-external/dsh-client-ui-skin-yamada-night-shift`，HTTP 提供的 bundle 与仓库文件 SHA-256 同为 `0099df1e278b8b88aaf8ca4fbfce773ff2432fc32f5526741ef092a0cd3ead0d`。 |

## 兼容性结论

- 已在解锁后的全新 Desktop 进程复核：原子更新 profile patch 后，PID `74645` 与端口 `49740` 保持不变，但 boot graph/窗口仍为山田皮肤；Skin Center `/api/skin-center/apply` 与链接 bundle 重建也不会更新已打开实例。这证明打包版 macOS DSH Desktop 2.0.1 的 watcher 不提供持久化无重启切换。
- 发布兼容标准因此明确为：DSH Web 在 watcher 生效后刷新；macOS DSH Desktop 2.0.1 在安装、切换、升级或卸载后退出并重新打开应用。用户已于 2026-08-18 接受此兼容约束。
- 按上述标准，本地链接安装、重复激活、切换后重启加载、实际卸载、原生还原、重新安装和最终窗口复核均已通过。该限制属于宿主 boot graph 生命周期，并不改变本插件的 presentation-only 行为或卸载清理保证。
- 最终 profile 中没有第二个 `ui-skin-*` bundle；DSH 页面内其他独立功能插件不属于皮肤互斥范围。

## 发布状态

- README 不含 GitHub 账号占位符，仓库名可直接使用 `dsh-yamada-night-shift`。
- GitHub 远程仓库创建与推送属于后续发布操作；当前目录包含发布所需的源码、构建产物、许可、说明、图片和验证证据。
