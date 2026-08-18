import type { AlbumView } from '../core/types.ts'

/** Cross-plugin contract used by the album and presentation skins. */
export const PHOTO_ALBUM_BACKGROUND_EVENT = 'dsh-photo-album:background-change'

export interface PhotoAlbumBackgroundChange {
  /** Opaque album photo id, or null when restoring the skin default. */
  id: string | null
  /** Human-readable filename for status copy. */
  name?: string
}

/** Reject path-like or unbounded values before they reach a media URL. */
export function isValidBackgroundPhotoId(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return false
  if (!value.startsWith('sample/') && !value.startsWith('user/')) return false
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return false
  const rest = value.slice(value.indexOf('/') + 1)
  return rest.length > 0 && rest.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..')
}

/** Notify a loaded skin immediately after the persisted setting changes. */
export function emitBackgroundChange(change: PhotoAlbumBackgroundChange): void {
  window.dispatchEvent(new CustomEvent<PhotoAlbumBackgroundChange>(PHOTO_ALBUM_BACKGROUND_EVENT, {
    detail: change,
  }))
}

/**
 * Re-announce the persisted selection after the Host album view becomes
 * available. This closes the cold-start race where a presentation skin can
 * mount before the photo-album route/client has finished starting.
 */
export function emitBackgroundFromAlbumView(view: AlbumView): void {
  const id = isValidBackgroundPhotoId(view.backgroundPhotoId)
    ? view.backgroundPhotoId
    : null
  const photo = id === null ? undefined : view.photos.find(item => item.id === id)
  emitBackgroundChange({ id, name: photo?.name })
}
