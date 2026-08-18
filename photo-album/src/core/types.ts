/**
 * Shared wire types for the photo-album plugin. The host half serves these
 * through /api/photo-album/*; the browser half decodes the same shapes, so the
 * definitions live in a package-common module both halves import (the client
 * bundle compiles its own copy).
 * @module dsh-photo-album/core/types
 */

/** A failed album operation. `code` is a stable machine token. */
export interface AlbumError {
  code: string
  message: string
}

/** The JSON envelope every /api/photo-album response uses. */
export type AlbumEnvelope<T> = { ok: true; value: T } | { ok: false; error: AlbumError }

/** One photo in the album. `id` is opaque; only the media route resolves it. */
export interface PhotoEntry {
  /** Opaque id the media route serves (`sample/<name>` or `user/<relpath>`). */
  id: string
  /** Display name (bare filename). */
  name: string
  /** Last-modified time, epoch ms. */
  mtime: number
  /** File size in bytes. */
  size: number
}

/** Where the album's photos currently come from. */
export type AlbumSource = 'samples' | 'directory'

/** The album view the gallery renders. */
export interface AlbumView {
  /** Album title from settings (fallback: built-in copy). */
  title: string
  /** Which source produced the photo list. */
  source: AlbumSource
  /** Resolved photos directory (empty when serving samples). */
  directory: string
  /** Photos, newest first. */
  photos: PhotoEntry[]
  /** Grid columns per row (1–12), forwarded from settings for the layout. */
  columns: number
  /** Persisted photo id currently used as the DSH background, when valid. */
  backgroundPhotoId?: string
  /** Non-fatal hint the gallery should surface (e.g. "directory not found"). */
  warning?: string
}
