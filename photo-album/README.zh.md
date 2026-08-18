# dsh-photo-album — DSH Web GUI 生活相册插件

[English](README.md) | 中文

一个可热插拔的 DeepSeek Harness (DSH) Web/Desktop 相册伴侣插件：在侧边栏增加 **相册** 入口，提供照片网格、灯箱大图和 **设为背景**。照片来自设置或相册内原生目录选择器指定的本地目录，背景选择写入插件自有状态，并与同仓库的山田皮肤即时联动。

- 不修改 DSH 源码：以 cordis 插件（host 半边 + 浏览器半边）+ 浏览器 DOM 扩展挂载，与 `dsh-web-ui` 全家桶里的任务看板 / 宠物等插件同一外挂形态。
- 卸载即恢复原状，与其它插件互不干扰。
- 配置走 DSH 设置页（`设置 → 相册`），照片目录 / 标题 / 列数 / 是否递归均可改。

## 功能

- **侧边栏入口**：侧边栏内、新会话按钮下方注入「相册」入口行（宽栏显示图标+文字，折叠 rail 显示纯图标，随 DSH 皮肤 token 自适应）。
- **相册网格**：照片按修改时间倒序排布，`columns` 控制每行列数；每张图懒加载，悬浮显示文件名。PNG、JPG/JPEG 是一等支持格式，同时支持 WebP、GIF、AVIF、BMP 与 SVG。
- **灯箱大图**：点照片打开灯箱，左右按钮或键盘方向键翻页、`Esc` 关闭，右上角「×」退出；顶部显示「当前张 / 总数」。
- **持久背景**：网格卡片和灯箱均提供「设为背景」；当前照片有明确状态，顶部可「恢复默认背景」。保存的是不透明照片 ID，不是图片字节，因此 macOS Desktop 重启后即使端口变化也能恢复。
- **直接选择 PNG/JPG**：顶部「选择 PNG/JPG 设为背景…」会打开系统文件选择器；选中的图片复制到 `DSH_HOME/storages/dsh-photo-album/photos/` 并立即应用。单文件上限 25 MB。
- **两种照片来源**：
  - 配置了 `photosDir` → 递归扫描该目录（`recursive` 开关控制是否进子目录），展示其中的 jpg/png/gif/webp/svg/avif/bmp 图片。
  - 未配置或目录不可读 → 回退内置示例照片，并给出提示（目录不存在/不是目录/无权限时带 `warning`）。
- **设置页**：`设置 → 相册` 一个一级设置页，分阶段表单（改完点保存才落盘），字段：启用 / 标题 / 照片目录 / 递归子目录 / 每行列数。
- **系统提示词注入**：host 半边通过 `SystemPrompt.section` 注册 `plugin:photo-album` 段，向每个 agent 声明本插件存在与能力，agent 无需外部文档即可知道如何与相册协作。

## 目录结构

```
package.json / tsconfig*.json / tsdown.config.ts / vitest.config.ts   # 独立仓库构建
cordis.patch.yml                          # 把插件行插入 web profile 组合
assets/samples/*.{png,jpg,svg}            # 内置多格式示例照片
src/index.ts                              # host 半边：设置段 + 路由 + 服务 + 系统提示词段
src/mount-once.ts                         # host 单实例守卫
src/core/album.ts                         # 目录扫描 / mime / 路径守卫（纯函数，可单测）
src/core/types.ts                         # 共享 wire 类型
src/host/service.ts                       # PhotoAlbumService（目录扫描 + 示例回退 + id 解析）
src/host/state-store.ts                   # DSH Home 原子状态文件（目录 + 背景选择）
src/host/routes.ts                        # /api/photo-album/*（list/media + 目录/背景写入）
src/host/loopback.ts                      # 回环请求守卫
src/client/index.ts                       # apply(ctx)：接线 locale / 设置卡 / 侧边栏入口 / 相册挂载
src/client/api.ts                         # 浏览器端 typed fetch
src/client/controller.ts                  # 打开/关闭 可观察状态
src/client/sidebar-entry.ts               # 侧边栏入口注入（MutationObserver 自愈）
src/client/gallery-mount.tsx              # 中间列相册挂载 + 显隐切换
src/client/PhotoAlbum.tsx                 # 相册网格 + 灯箱（React）
src/client/background-selection.ts        # 背景选择事件与 id 校验
src/client/AlbumSettingsCard.tsx          # 设置页卡片
src/client/settings-form.ts               # 分阶段表单模型
src/client/locales.ts                     # zh/en 文案
src/client/styles.ts                      # 样式字符串（前缀 dsh-pa-，注入 <style>）
```

## 为什么这样接（调研结论）

- **侧边栏 / 中间列没有可用的外挂槽位**：侧边栏壳只声明 `sidebar.workspaces` / `sidebar.settings` 两个 single 槽位且已被占用；`conversation` 槽位是 single 且被 ui-conversation 占用。因此入口与相册视图都走 DOM 注入 + MutationObserver 自愈（与任务看板同一先例），中间列通过 `<html data-dsh-photoalbum-active>` 属性切换显隐，底下的对话子树保持挂载有状态。
- **照片要跨进程出图**：客户端插件跑在浏览器里，无法直接读宿主机文件系统，所以 host 半边在共享 webserver 上注册 `/api/photo-album/list`（返回照片清单）与 `/api/photo-album/media?id=...`（按 id 流式返回图片字节），浏览器同源 `fetch` / `<img src>` 拉取。
- **安全边界**：所有 `/api/photo-album/*` 路由先过回环守卫（socket 地址 + Host 头 + 浏览器同源标记），局域网暴露的部署无法枚举或读取照片；`user/` id 解析时用 `resolveInside` 拒绝 `..` 穿越，只允许落在配置目录内的文件。
- **配置与即时选择分层**：标题 / 列数 / 递归等普通配置沿用 DSH settings；相册内原生目录选择器与「设为背景」写入 `DSH_HOME/storages/dsh-photo-album.json`。这样兼容未暴露外部 settings namespace 的 Desktop 版本，也不受随机端口影响。

## 安装

从本仓库根目录执行：

```sh
dsh plugin --profile web add "$PWD/photo-album"
dsh plugin --profile desktop add "$PWD/photo-album"
```

只为实际使用的 profile 执行对应一行。首次注册后重启 `dsh web`；macOS DSH Desktop 2.0.1 退出并重新打开。侧边栏出现「相册」入口即生效。要让背景变化应用到山田夜景，请同时安装仓库内的 `yamada-night-shift/`。

## 放上自己的照片

只换一张背景时，打开侧边栏 **相册**，点击顶部 **选择 PNG/JPG 设为背景…**，可在 Finder 中直接点选 `.png`、`.jpg` 或 `.jpeg` 文件。插件会把它复制进自己的本地图库并立即设为背景。

需要浏览整个文件夹时：

1. 打开 DSH 设置 → **相册**。
2. 把「照片目录」填成你的照片文件夹绝对路径（支持 `~/` 开头，例如 `~/Pictures/生活照`）。
3. 需要包含子文件夹就打开「递归子目录」，调整「每行列数」到合适值。
4. 保存，重新打开侧边栏「相册」即刷新（每次打开都会重新扫描目录）。
5. 在网格卡片或灯箱中点击「设为背景」；顶部「恢复默认背景」返回山田内置夜景。

没有照片目录时，插件展示内置的 6 张示例图（`assets/samples/`），其中直接包含真实 PNG 和 JPG 文件，安装后即可看到并设为背景。

## 构建

前置：Node ≥ 22.19，类型与运行时 API 全部来自官方 NPM SDK（`@deepseek-ai/*` devDependencies），无需任何 DSH 源码 checkout。

```sh
pnpm install          # 首次
pnpm run typecheck    # tsc --noEmit
pnpm run test         # vitest 单测（core/album）
pnpm run build        # tsdown 产出 lib/index.js（host）+ lib/client.js（浏览器），tsc 产出 lib/types/*.d.ts
```

## 隐私与安全

- `/api/photo-album/*` 仅接受 loopback 请求，媒体 id 经过目录穿越防护。
- 直接选择的 PNG/JPG 只复制到本机 `DSH_HOME/storages/dsh-photo-album/photos/`；目录模式不复制源照片。所有照片都不会上传、写入浏览器存储或复制进本仓库；状态文件以临时文件 + rename 原子更新。
- 照片被删除、目录变化、伴侣包停用或响应格式异常时，山田皮肤回退到内置夜景。

## 许可

MIT，见本目录 `LICENSE`。山田皮肤与视觉素材另按仓库根目录说明使用 CC BY-NC-SA 4.0。
