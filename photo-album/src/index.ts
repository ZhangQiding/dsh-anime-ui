/**
 * dsh-photo-album — host half: the photo-album settings section, the album
 * service (directory scan + sample fallback), and the /api/photo-album/* routes
 * on the shared webserver. The browser half (exports "./client") is served by
 * client-modules from the same package's `dsh.client` declaration.
 *
 * The host half also announces the plugin to every agent through the
 * system-prompt section mechanism, so agents know the album exists and how to
 * cooperate with it.
 * @module dsh-photo-album
 */

import type { Context } from '@deepseek-ai/cordis'
import { fileURLToPath } from 'node:url'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from 'schemastery'
import { mountOnce } from './mount-once.ts'
import { registerAlbumRoutes } from './host/routes.ts'
import { PhotoAlbumService, type AlbumConfig } from './host/service.ts'
import { AlbumStateStore, defaultAlbumStatePath } from './host/state-store.ts'

/** Settings namespace the browser settings card edits (the Host registers it). */
export const PHOTO_ALBUM_SETTINGS_NAMESPACE = 'photo-album'

/** Order of the announcement section within the tool-guidance band. */
const SECTION_ORDER = 215

/** Model-facing announcement: plugin presence, capabilities, and limits. */
export const PHOTO_ALBUM_GUIDANCE = '本机已安装 dsh-photo-album 插件（DSH Web GUI 的生活相册）：侧边栏「相册」入口，点击后中间列切换为相册网格 + 灯箱大图。能力：读取本地照片目录（设置里配置 photosDir，支持子目录递归、按修改时间倒序），或回退到内置示例照片；照片可在网格或灯箱中设为 DSH 背景并持久化，也可恢复皮肤默认背景；点照片打开灯箱（左右翻页、键盘方向键、ESC 关闭）。数据源为宿主进程经 /api/photo-album/* 路由提供（仅回环可访问）；照片目录/标题/列数等可在设置页「相册」中配置。用户提到「相册 / 生活照片 / 照片 / photo album」时即指本插件，请据此协作。'

/** Settings slice the browser card edits and the service reads. */
export interface Config extends AlbumConfig {
  /** Master switch for the plugin (browser half + host routes/announcement). */
  enabled?: boolean
  /** Announce the plugin to agents in the system prompt. */
  announceToAgent?: boolean
}

/** Plugin config, validated by the same-named schemastery schema. */
export const Config: z<Config> = z.object({
  photosDir: z.string().default(''),
  title: z.string().default('生活相册'),
  recursive: z.boolean().default(true),
  columns: z.number().step(1).min(1).max(12).default(4),
  backgroundPhotoId: z.string().default(''),
  enabled: z.boolean().default(true),
  announceToAgent: z.boolean().default(true),
})

/** Resolve the bundled sample-photos directory relative to this module. */
function samplesDir(importMetaUrl: string): string {
  // Both the source tree (src/index.ts) and the built bundle (lib/index.js)
  // sit one directory level below the package root.
  return fileURLToPath(new URL('../assets/samples', importMetaUrl))
}

/** Required services: the route registry and the prompt band. */
export const inject = ['webServer', 'systemPrompt']

/**
 * Mount the album service, its routes, and the announcement section.
 * @param ctx - context carrying webServer and systemPrompt.
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export const apply = mountOnce('dsh-photo-album', applyImpl)

function applyImpl(ctx: Context, config: Config = {}): void {
  // The full settings surface remains optional. Immediate gallery choices are
  // also written to the plugin-owned DSH_HOME state store, so directory and
  // background selection still work in reduced/compatibility deployments.
  let current: () => Config = () => config ?? {}
  const service = new PhotoAlbumService({
    getConfig: () => current(),
    samplesDir: samplesDir(import.meta.url),
    stateStore: new AlbumStateStore(defaultAlbumStatePath()),
  })

  let disposeRoutes: (() => void) | undefined
  let disposePrompt: (() => void) | undefined

  // Register (or drop) routes and the announcement to match the current source.
  const sync = (): void => {
    const value = current()
    const enabled = value.enabled ?? true
    const announce = value.announceToAgent ?? true
    if (disposeRoutes === undefined && enabled) {
      disposeRoutes = ctx.effect(() => {
        const dispose = registerAlbumRoutes(ctx, service)
        return () => dispose()
      }, 'dsh-photo-album: /api/photo-album routes')
    } else if (disposeRoutes !== undefined && !enabled) {
      disposeRoutes()
      disposeRoutes = undefined
    }
    if (disposePrompt === undefined && enabled && announce) {
      disposePrompt = ctx.effect(() => ctx.systemPrompt.section({
        name: 'plugin:photo-album',
        order: SECTION_ORDER,
        text: PHOTO_ALBUM_GUIDANCE,
      }), 'dsh-photo-album: prompt section')
    } else if (disposePrompt !== undefined && (!enabled || !announce)) {
      disposePrompt()
      disposePrompt = undefined
    }
  }

  installSettingsSection(
    ctx,
    settingsNamespace(PHOTO_ALBUM_SETTINGS_NAMESPACE),
    Config,
    config ?? {},
    {
      setSource: (source) => { current = source },
      onChange: sync,
    },
  )

  sync()
}
