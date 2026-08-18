/**
 * dsh-photo-album browser half: wires the settings card and the two DOM
 * surfaces (sidebar entry + center-column gallery) to the client runtime.
 *
 * Failure policy: DOM mounting problems are logged, never thrown — the web
 * shell fails the whole boot when a plugin apply throws, and an external
 * plugin must not take the GUI down.
 * @module dsh-photo-album/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the settings-surface Context merge (ctx.settingsScope).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { AlbumController } from './controller.ts'
import { importAlbumPhoto, persistAlbumBackground, persistAlbumDirectory } from './api.ts'
import { mountGallery } from './gallery-mount.tsx'
import { mountSidebarEntry } from './sidebar-entry.ts'
import { AlbumSettingsCardController, AlbumSettingsSection, type AlbumSettings } from './AlbumSettingsCard.tsx'
import { NS, en, zh } from './locales.ts'
import { injectAlbumCss } from './styles.ts'

/** Settings namespace the settings card edits (the Host plugin registers it). */
const ALBUM_SETTINGS_NS = 'photo-album'

/** Required services (fiber inject waiting — the runtime must be up first). */
export const inject = ['slots', 'locale', 'connection', 'settingsScope', 'remote', 'workspaces']

/**
 * Mount the photo album.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  injectAlbumCss()
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'photo-album: dictionaries')

  // Plugin configuration card: one staged form over the `photo-album` settings
  // namespace, registered as a first-level settings page.
  const settingsScope = ctx.settingsScope.bind<AlbumSettings>({ namespace: ALBUM_SETTINGS_NS })
  const settingsCard = new AlbumSettingsCardController(settingsScope, () => ctx.workspaces.pickDirectory())
  ctx.slots.inject('settings.section', () => {
    const unregister = ctx.slots.register({
      name: 'settings.section',
      id: 'photo-album',
      order: 140,
      label: () => ctx.locale.bind(NS)('settings.title'),
      locale: NS,
      inject: () => settingsCard.inject(),
    }, AlbumSettingsSection)
    return () => {
      settingsCard.dispose()
      unregister()
    }
  })

  // The sidebar entry and gallery view mount once the settings scope settles.
  let uiDisposer: (() => void) | undefined
  const mountUi = (): void => {
    if (uiDisposer !== undefined) return
    const controller = new AlbumController()
    const disposers: Array<() => void> = []
    try {
      disposers.push(mountSidebarEntry(controller))
      disposers.push(mountGallery(controller, {
        pickDirectory: () => ctx.workspaces.pickDirectory(),
        setPhotosDir: async (path) => {
          const result = await persistAlbumDirectory(path)
          if (!result.ok) throw new Error(result.error.message)
        },
        importPhoto: async (file) => {
          const result = await importAlbumPhoto(file)
          if (!result.ok) throw new Error(result.error.message)
          return result.value
        },
        setBackgroundPhotoId: async (id) => {
          const result = await persistAlbumBackground(id === '' ? null : id)
          if (!result.ok) throw new Error(result.error.message)
        },
      }))
    } catch (error) {
      // DOM failures degrade the album, never the GUI.
      console.error('[dsh-photo-album] mount failed:', error)
    }
    uiDisposer = () => {
      for (const dispose of disposers.splice(0)) dispose()
      uiDisposer = undefined
    }
  }
  const syncEnabled = (): void => {
    const snapshot = settingsScope.getSnapshot()
    const enabled = snapshot.status === 'ready'
      ? snapshot.value?.enabled ?? true
      : snapshot.status === 'unavailable'
    if (enabled) mountUi()
    else uiDisposer?.()
  }
  settingsScope.subscribe(syncEnabled)
  syncEnabled()
}
