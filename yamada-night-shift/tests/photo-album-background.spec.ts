// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  PHOTO_ALBUM_LIST_URL,
  backgroundUrlFromAlbumView,
  backgroundUrlFromEvent,
  fetchAlbumBackground,
  fetchAlbumBackgroundState,
} from '../src/client/photo-album-background.ts'

describe('photo-album background bridge', () => {
  it('accepts only a selected id present in the returned album', () => {
    const view = {
      backgroundPhotoId: 'user/night/a.jpg',
      photos: [{ id: 'user/night/a.jpg' }, { id: 'user/night/b.jpg' }],
    }
    expect(backgroundUrlFromAlbumView(view)).toBe('/api/photo-album/media?id=user%2Fnight%2Fa.jpg')
    expect(backgroundUrlFromAlbumView({ ...view, backgroundPhotoId: 'user/../secret.jpg' })).toBeNull()
    expect(backgroundUrlFromAlbumView({ ...view, backgroundPhotoId: 'user/missing.jpg' })).toBeNull()
  })

  it('reads the persisted same-origin selection through the album route', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      value: {
        backgroundPhotoId: 'sample/sample-1.svg',
        photos: [{ id: 'sample/sample-1.svg' }],
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    await expect(fetchAlbumBackground(fetchImpl as typeof fetch))
      .resolves.toBe('/api/photo-album/media?id=sample%2Fsample-1.svg')
    expect(fetchImpl).toHaveBeenCalledWith(PHOTO_ALBUM_LIST_URL, { cache: 'no-store' })
  })

  it('distinguishes a cold-start route failure from a ready default selection', async () => {
    const unavailable = vi.fn(async () => new Response('', { status: 404 }))
    await expect(fetchAlbumBackgroundState(unavailable as typeof fetch))
      .resolves.toEqual({ ready: false })

    const ready = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      value: { backgroundPhotoId: null, photos: [] },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    await expect(fetchAlbumBackgroundState(ready as typeof fetch))
      .resolves.toEqual({ ready: true, source: null })
  })

  it('decodes immediate apply and reset events without accepting arbitrary URLs', () => {
    expect(backgroundUrlFromEvent(new CustomEvent('x', { detail: { id: 'user/a.jpg' } })))
      .toBe('/api/photo-album/media?id=user%2Fa.jpg')
    expect(backgroundUrlFromEvent(new CustomEvent('x', { detail: { id: null } }))).toBeNull()
    expect(backgroundUrlFromEvent(new CustomEvent('x', { detail: { id: 'https://example.com/a.jpg' } })))
      .toBeUndefined()
  })
})
