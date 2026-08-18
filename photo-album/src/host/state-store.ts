/**
 * Small plugin-owned state document for choices that must work even when the
 * optional DSH settings surface is unavailable. The file lives below the
 * effective DSH_HOME and contains paths/opaque ids only, never photo bytes.
 * @module dsh-photo-album/host/state-store
 */

import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'

/** Durable choices owned by the album companion. */
export interface AlbumState {
  /** User-selected photo directory. */
  photosDir?: string
  /** Opaque id of the current skin background. */
  backgroundPhotoId?: string
}

/** A patch value of null removes that field from the state document. */
export type AlbumStatePatch = { [K in keyof AlbumState]?: AlbumState[K] | null }

/** Resolve the state file below the active DSH home. */
export function defaultAlbumStatePath(
  environment: NodeJS.ProcessEnv = process.env,
  userHome: string = homedir(),
): string {
  const configured = environment.DSH_HOME?.trim()
  const dshHome = configured !== undefined && configured !== '' ? configured : join(userHome, '.dsh')
  return join(dshHome, 'storages', 'dsh-photo-album.json')
}

/** Narrow an untrusted parsed JSON value into the supported state fields. */
function decodeState(value: unknown): AlbumState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  return {
    ...(typeof record.photosDir === 'string' && record.photosDir.trim() !== ''
      ? { photosDir: record.photosDir }
      : {}),
    ...(typeof record.backgroundPhotoId === 'string' && record.backgroundPhotoId !== ''
      ? { backgroundPhotoId: record.backgroundPhotoId }
      : {}),
  }
}

/** Atomic JSON store with serialized updates. */
export class AlbumStateStore {
  private tail: Promise<void> = Promise.resolve()

  constructor(readonly filename: string) {}

  /** Read the last valid state; absence or malformed JSON safely means empty. */
  async read(): Promise<AlbumState> {
    try {
      return decodeState(JSON.parse(await readFile(this.filename, 'utf8')) as unknown)
    } catch {
      return {}
    }
  }

  /** Merge one patch and durably replace the document before resolving. */
  update(patch: AlbumStatePatch): Promise<AlbumState> {
    let result: AlbumState = {}
    const task = this.tail.then(async () => {
      const next: AlbumState = { ...await this.read() }
      for (const [key, value] of Object.entries(patch) as Array<[keyof AlbumState, string | null | undefined]>) {
        if (value === null || value === undefined || value === '') delete next[key]
        else next[key] = value
      }
      await this.write(next)
      result = next
    })
    this.tail = task.catch(() => {})
    return task.then(() => result)
  }

  /** Write through a private temporary file and atomic rename. */
  private async write(value: AlbumState): Promise<void> {
    const directory = dirname(this.filename)
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const temporary = join(directory, `.dsh-photo-album.${randomUUID()}.tmp`)
    try {
      await writeFile(temporary, `${JSON.stringify({ version: 1, ...value }, null, 2)}\n`, {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      })
      await rename(temporary, this.filename)
    } finally {
      await unlink(temporary).catch(() => {})
    }
  }
}
