/** Optional same-origin integration with the companion dsh-photo-album package. */
export const PHOTO_ALBUM_BACKGROUND_EVENT = 'dsh-photo-album:background-change'
export const PHOTO_ALBUM_LIST_URL = '/api/photo-album/list'

interface AlbumPhoto {
  id?: unknown
}

interface AlbumViewLike {
  backgroundPhotoId?: unknown
  photos?: unknown
}

export type AlbumBackgroundFetchResult =
  | { ready: true; source: string | null }
  | { ready: false }

/** Validate the album's opaque ids before constructing a same-origin URL. */
export function isValidBackgroundPhotoId(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return false
  if (!value.startsWith('sample/') && !value.startsWith('user/')) return false
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return false
  const rest = value.slice(value.indexOf('/') + 1)
  return rest.length > 0 && rest.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..')
}

/** Return a same-origin route URL only when the selected id exists in the view. */
export function backgroundUrlFromAlbumView(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null
  const view = value as AlbumViewLike
  const selected = view.backgroundPhotoId
  if (!isValidBackgroundPhotoId(selected) || !Array.isArray(view.photos)) return null
  const present = view.photos.some((photo: AlbumPhoto) => photo !== null
    && typeof photo === 'object'
    && (photo as AlbumPhoto).id === selected)
  if (!present) return null
  return `/api/photo-album/media?id=${encodeURIComponent(selected)}`
}

/**
 * Fetch the persisted selection while preserving whether the companion route
 * is ready. A ready response with no selection is distinct from a cold-start
 * 404/network failure, so the skin can retry only the latter.
 */
export async function fetchAlbumBackgroundState(
  fetchImpl: typeof fetch = fetch,
): Promise<AlbumBackgroundFetchResult> {
  try {
    const response = await fetchImpl(PHOTO_ALBUM_LIST_URL, { cache: 'no-store' })
    if (!response.ok) return { ready: false }
    const envelope = await response.json() as unknown
    if (typeof envelope !== 'object' || envelope === null) return { ready: false }
    const record = envelope as Record<string, unknown>
    if (record.ok !== true) return { ready: false }
    return { ready: true, source: backgroundUrlFromAlbumView(record.value) }
  } catch {
    return { ready: false }
  }
}

/** Fetch once; unavailable/malformed companion routes degrade to default. */
export async function fetchAlbumBackground(
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const result = await fetchAlbumBackgroundState(fetchImpl)
  return result.ready ? result.source : null
}

/** Decode the immediate in-page event without trusting a caller-provided URL. */
export function backgroundUrlFromEvent(event: Event): string | null | undefined {
  const detail = (event as CustomEvent<unknown>).detail
  if (typeof detail !== 'object' || detail === null) return undefined
  const id = (detail as Record<string, unknown>).id
  if (id === null) return null
  if (!isValidBackgroundPhotoId(id)) return undefined
  return `/api/photo-album/media?id=${encodeURIComponent(id)}`
}
