import z from "schemastery";
import { Context } from "@deepseek-ai/cordis";
//#region src/host/service.d.ts
/** The album's settings slice (mirrors the host settings section). */
interface AlbumConfig {
  /** Absolute or ~-relative directory of the user's photos. */
  photosDir?: string;
  /** Album title. */
  title?: string;
  /** Descend into subdirectories when scanning. */
  recursive?: boolean;
  /** Number of grid columns (1–12); client-side layout hint. */
  columns?: number;
  /** Opaque photo id selected as the persisted DSH background. */
  backgroundPhotoId?: string;
}
//#endregion
//#region src/index.d.ts
/** Settings namespace the browser settings card edits (the Host registers it). */
declare const PHOTO_ALBUM_SETTINGS_NAMESPACE = "photo-album";
/** Model-facing announcement: plugin presence, capabilities, and limits. */
declare const PHOTO_ALBUM_GUIDANCE = "本机已安装 dsh-photo-album 插件（DSH Web GUI 的生活相册）：侧边栏「相册」入口，点击后中间列切换为相册网格 + 灯箱大图。能力：可直接选择 PNG/JPG 文件、复制进插件本地图库并立即设为背景；也可读取本地照片目录（支持子目录递归、按修改时间倒序），或回退到内置示例照片。照片可在网格或灯箱中设为 DSH 背景并持久化，也可恢复皮肤默认背景；点照片打开灯箱（左右翻页、键盘方向键、ESC 关闭）。数据源为宿主进程经 /api/photo-album/* 路由提供（仅回环可访问）；照片目录/标题/列数等可在设置页「相册」中配置。用户提到「相册 / 生活照片 / 照片 / photo album」时即指本插件，请据此协作。";
/** Settings slice the browser card edits and the service reads. */
interface Config extends AlbumConfig {
  /** Master switch for the plugin (browser half + host routes/announcement). */
  enabled?: boolean;
  /** Announce the plugin to agents in the system prompt. */
  announceToAgent?: boolean;
}
/** Plugin config, validated by the same-named schemastery schema. */
declare const Config: z<Config>;
/** Required services: the route registry and the prompt band. */
declare const inject: string[];
/**
 * Mount the album service, its routes, and the announcement section.
 * @param ctx - context carrying webServer and systemPrompt.
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
declare const apply: typeof applyImpl;
declare function applyImpl(ctx: Context, config?: Config): void;
//#endregion
export { Config, PHOTO_ALBUM_GUIDANCE, PHOTO_ALBUM_SETTINGS_NAMESPACE, apply, inject };