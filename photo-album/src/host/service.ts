/**
 * Photo-album host service: resolves the current photo source (a configured
 * directory, falling back to the built-in samples), scans it into an album
 * view, and maps the opaque photo ids the browser holds back to absolute file
 * paths the media route streams. No cordis imports — the routes wire it.
 * @module dsh-photo-album/host/service
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { isImageFile, listImageFiles, mimeForFile, resolveInside } from '../core/album.ts'
import type { AlbumError, AlbumView, PhotoEntry } from '../core/types.ts'
import type { AlbumStateStore } from './state-store.ts'

/** The album's settings slice (mirrors the host settings section). */
export interface AlbumConfig {
  /** Absolute or ~-relative directory of the user's photos. */
  photosDir?: string
  /** Album title. */
  title?: string
  /** Descend into subdirectories when scanning. */
  recursive?: boolean
  /** Number of grid columns (1–12); client-side layout hint. */
  columns?: number
  /** Opaque photo id selected as the persisted DSH background. */
  backgroundPhotoId?: string
}

/** Sample photo id prefix (`sample/<name>`). */
export const SAMPLE_PREFIX = 'sample/'
/** User photo id prefix (`user/<relpath>`). */
export const USER_PREFIX = 'user/'

const DEFAULT_TITLE = '生活相册'
export const MAX_IMPORTED_PHOTO_BYTES = 25 * 1024 * 1024

/** Clamp a possibly-missing columns value into the valid 1–12 range. */
function clampColumns(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 4
  return Math.min(12, Math.max(1, Math.round(value)))
}

/** Result of resolving a photo id to a file the media route can stream. */
export type MediaResolve = { ok: true; abs: string; mime: string } | { ok: false; error: AlbumError }

/** Browser-selected raster image copied into the plugin-managed library. */
export interface ImportedPhoto {
  name: string
  contentType: string
  data: Buffer
}

const NOT_FOUND: AlbumError = { code: 'not-found', message: 'photo not found' }

/**
 * Expand `~` and environment-free home shorthand to an absolute path.
 * The browser passes a raw string; `~` alone or a leading `~/` expands against
 * the host user's home directory.
 */
export function expandHome(dir: string): string {
  if (dir === '~') return process.env.HOME ?? ''
  if (dir.startsWith('~/')) return join(process.env.HOME ?? '', dir.slice(2))
  return dir
}

/**
 * Scan one directory into photo entries, id-prefixed for the media route.
 * @param root - absolute directory.
 * @param prefix - `sample/` or `user/`.
 * @param recursive - descend into subdirectories.
 */
async function scan(root: string, prefix: string, recursive: boolean): Promise<PhotoEntry[]> {
  const files = await listImageFiles(root, recursive)
  return files.map(file => ({
    id: `${prefix}${file.relPath}`,
    name: file.name,
    mtime: file.mtime,
    size: file.size,
  }))
}

/**
 * The album service. `getConfig` returns the live settings slice; `samplesDir`
 * is the absolute path of the package's bundled sample photos.
 */
export class PhotoAlbumService {
  private readonly getConfig: () => AlbumConfig
  private readonly samplesDir: string
  private readonly importsDir: string | undefined
  private readonly stateStore: AlbumStateStore | undefined

  constructor(deps: { getConfig: () => AlbumConfig; samplesDir: string; importsDir?: string; stateStore?: AlbumStateStore }) {
    this.getConfig = deps.getConfig
    this.samplesDir = deps.samplesDir
    this.importsDir = deps.importsDir
    this.stateStore = deps.stateStore
  }

  /** The live settings slice (title/columns are forwarded to the browser). */
  config(): AlbumConfig {
    return this.getConfig()
  }

  /** Merge plugin-owned immediate choices over ordinary DSH settings. */
  private async effectiveConfig(): Promise<AlbumConfig> {
    const persisted = await this.stateStore?.read() ?? {}
    return { ...this.getConfig(), ...persisted }
  }

  /**
   * Build the album view. A configured `photosDir` is scanned first; an empty
   * result still counts as the user's (possibly empty) album, while an
   * unreadable directory falls back to samples with a warning. No directory
   * configured (or a fallback) serves the bundled samples.
   */
  async list(): Promise<AlbumView> {
    const config = await this.effectiveConfig()
    const title = config.title?.trim() !== '' && config.title !== undefined
      ? config.title.trim()
      : DEFAULT_TITLE
    const recursive = config.recursive ?? true
    const columns = clampColumns(config.columns)
    const rawDir = config.photosDir?.trim()
    if (rawDir !== undefined && rawDir !== '') {
      const dir = expandHome(rawDir)
      try {
        const info = await stat(dir)
        if (info.isDirectory()) {
          const photos = await scan(dir, USER_PREFIX, recursive)
          return this.withBackground({ title, source: 'directory', directory: dir, photos, columns }, config.backgroundPhotoId)
        }
        return this.withBackground({
          title,
          source: 'samples',
          directory: '',
          photos: await scan(this.samplesDir, SAMPLE_PREFIX, false),
          columns,
          warning: `照片路径不是目录：${dir}`,
        }, config.backgroundPhotoId)
      } catch {
        return this.withBackground({
          title,
          source: 'samples',
          directory: '',
          photos: await scan(this.samplesDir, SAMPLE_PREFIX, false),
          columns,
          warning: `照片目录不存在或无法读取：${dir}`,
        }, config.backgroundPhotoId)
      }
    }
    return this.withBackground(
      { title, source: 'samples', directory: '', photos: await scan(this.samplesDir, SAMPLE_PREFIX, false), columns },
      config.backgroundPhotoId,
    )
  }

  /** Persist a user-selected directory outside the optional settings surface. */
  async setPhotosDir(path: string): Promise<AlbumView> {
    const normalized = path.trim()
    if (normalized === '') throw new Error('photo directory must not be empty')
    if (this.stateStore === undefined) throw new Error('album state store unavailable')
    await this.stateStore.update({ photosDir: normalized, backgroundPhotoId: null })
    return this.list()
  }

  /**
   * Copy one browser-selected PNG/JPEG into the managed local library and make
   * it the active background. The original file is never modified.
   */
  async importPhoto(photo: ImportedPhoto): Promise<AlbumView> {
    if (this.stateStore === undefined || this.importsDir === undefined) {
      throw new Error('album import store unavailable')
    }
    if (photo.data.length === 0) throw new Error('photo is empty')
    if (photo.data.length > MAX_IMPORTED_PHOTO_BYTES) throw new Error('photo exceeds 25 MB limit')
    const original = photo.name.split(/[\\/]/).at(-1)?.normalize('NFKC') ?? ''
    const extension = extname(original).toLowerCase()
    const contentType = photo.contentType.split(';', 1)[0]?.trim().toLowerCase()
    const png = extension === '.png' && contentType === 'image/png'
      && photo.data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    const jpeg = (extension === '.jpg' || extension === '.jpeg') && contentType === 'image/jpeg'
      && photo.data.length >= 3 && photo.data[0] === 0xff && photo.data[1] === 0xd8 && photo.data[2] === 0xff
    if (!png && !jpeg) throw new Error('only valid PNG and JPG/JPEG files can be imported')

    const rawStem = original.slice(0, -extension.length)
      .replace(/[\u0000-\u001f\u007f:]/g, '_')
      .replace(/^\.+/, '')
      .trim()
    const stem = (rawStem === '' ? 'photo' : rawStem).slice(0, 120)
    await mkdir(this.importsDir, { recursive: true, mode: 0o700 })
    let savedName = `${stem}${extension}`
    let destination = join(this.importsDir, savedName)
    try {
      await writeFile(destination, photo.data, { flag: 'wx', mode: 0o600 })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      savedName = `${stem}-${randomUUID().slice(0, 8)}${extension}`
      destination = join(this.importsDir, savedName)
      await writeFile(destination, photo.data, { flag: 'wx', mode: 0o600 })
    }
    try {
      await this.stateStore.update({
        photosDir: this.importsDir,
        backgroundPhotoId: `${USER_PREFIX}${savedName}`,
      })
    } catch (error) {
      await unlink(destination).catch(() => {})
      throw error
    }
    return this.list()
  }

  /** Persist a valid photo id, or null to restore the skin default. */
  async setBackgroundPhotoId(id: string | null): Promise<AlbumView> {
    if (this.stateStore === undefined) throw new Error('album state store unavailable')
    if (id === null) {
      await this.stateStore.update({ backgroundPhotoId: null })
      return this.list()
    }
    const current = await this.list()
    if (!current.photos.some(photo => photo.id === id)) throw new Error('photo not found')
    await this.stateStore.update({ backgroundPhotoId: id })
    return this.list()
  }

  /** Include a selection only while it still belongs to the current album. */
  private withBackground(view: AlbumView, selected: string | undefined): AlbumView {
    if (selected !== undefined && view.photos.some(photo => photo.id === selected)) {
      return { ...view, backgroundPhotoId: selected }
    }
    return view
  }

  /**
   * Resolve a photo id to the absolute file the media route streams. Sample ids
   * name a bare filename inside the samples directory; user ids name a
   * `/`-separated path that must resolve inside the configured directory.
   */
  async resolveMedia(id: string): Promise<MediaResolve> {
    const slash = id.indexOf('/')
    if (slash < 0) return { ok: false, error: NOT_FOUND }
    const prefix = id.slice(0, slash + 1)
    const rest = id.slice(slash + 1)

    if (prefix === SAMPLE_PREFIX) {
      if (rest.includes('/') || rest.includes('\\') || rest === '' || !isImageFile(rest)) {
        return { ok: false, error: NOT_FOUND }
      }
      const abs = join(this.samplesDir, rest)
      return this.statImage(abs)
    }
    if (prefix === USER_PREFIX) {
      const config = await this.effectiveConfig()
      const rawDir = config.photosDir?.trim()
      if (rawDir === undefined || rawDir === '') return { ok: false, error: NOT_FOUND }
      const dir = expandHome(rawDir)
      const abs = resolveInside(dir, rest)
      if (abs === null || !isImageFile(basename(abs))) return { ok: false, error: NOT_FOUND }
      return this.statImage(abs)
    }
    return { ok: false, error: NOT_FOUND }
  }

  /** Stat an image path; a missing/non-file path answers not-found. */
  private async statImage(abs: string): Promise<MediaResolve> {
    try {
      const info = await stat(abs)
      if (!info.isFile()) return { ok: false, error: NOT_FOUND }
      return { ok: true, abs, mime: mimeForFile(abs) }
    } catch {
      return { ok: false, error: NOT_FOUND }
    }
  }

  /** Number of bundled sample photos (used by tests and diagnostics). */
  async sampleCount(): Promise<number> {
    try {
      const entries = await readdir(this.samplesDir)
      return entries.filter(isImageFile).length
    } catch {
      return 0
    }
  }
}
