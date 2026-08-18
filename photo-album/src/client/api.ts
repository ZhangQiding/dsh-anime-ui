/**
 * Browser client for the host /api/photo-album/* routes: fetch the album view
 * and build the media URL for each photo. Same-origin relative fetch (the page
 * and the routes share the webserver).
 * @module dsh-photo-album/client/api
 */

import type { AlbumEnvelope, AlbumError, AlbumView } from '../core/types.ts'

/** Decode the shared JSON envelope without trusting the route response. */
async function decodeAlbum(response: Response): Promise<AlbumEnvelope<AlbumView>> {
  try {
    const envelope = await response.json() as unknown
    if (typeof envelope !== 'object' || envelope === null) {
      return { ok: false, error: { code: 'internal', message: 'bad response' } }
    }
    const record = envelope as Record<string, unknown>
    if (record.ok === true) return { ok: true, value: record.value as AlbumView }
    return { ok: false, error: (record.error as AlbumError | undefined) ?? { code: 'internal', message: 'bad response' } }
  } catch {
    return { ok: false, error: { code: 'internal', message: 'bad response' } }
  }
}

/** Transport failure (fetch threw or the response was not JSON). */
async function getAlbum(): Promise<AlbumEnvelope<AlbumView>> {
  let response: Response
  try {
    response = await fetch('/api/photo-album/list', { cache: 'no-store' })
  } catch {
    return { ok: false, error: { code: 'internal', message: 'album route unavailable' } }
  }
  return decodeAlbum(response)
}

/** Persist one gallery-owned choice through the loopback Host route. */
async function postAlbum(path: string, payload: Record<string, unknown>): Promise<AlbumEnvelope<AlbumView>> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    return { ok: false, error: { code: 'internal', message: 'album route unavailable' } }
  }
  return decodeAlbum(response)
}

/** Media URL for one photo id. */
export function mediaUrl(id: string): string {
  return `/api/photo-album/media?id=${encodeURIComponent(id)}`
}

/** Fetch the current album view; never throws. */
export function fetchAlbum(): Promise<AlbumEnvelope<AlbumView>> {
  return getAlbum()
}

/** Persist the selected directory; the Host returns the refreshed album. */
export function persistAlbumDirectory(path: string): Promise<AlbumEnvelope<AlbumView>> {
  return postAlbum('/api/photo-album/directory', { path })
}

/** Persist a background id; null restores the skin's bundled background. */
export function persistAlbumBackground(id: string | null): Promise<AlbumEnvelope<AlbumView>> {
  return postAlbum('/api/photo-album/background', { id })
}

/** Copy one directly selected PNG/JPEG into the managed local album. */
export async function importAlbumPhoto(file: File): Promise<AlbumEnvelope<AlbumView>> {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  const contentType = extension === '.png'
    ? 'image/png'
    : extension === '.jpg' || extension === '.jpeg'
      ? 'image/jpeg'
      : file.type
  let response: Response
  try {
    response = await fetch(`/api/photo-album/import?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: file,
    })
  } catch {
    return { ok: false, error: { code: 'internal', message: 'album route unavailable' } }
  }
  return decodeAlbum(response)
}
