import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PHOTO_ALBUM_BACKGROUND_EVENT,
  emitBackgroundFromAlbumView,
  isValidBackgroundPhotoId,
} from './background-selection.ts'

describe('background photo ids', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('accepts sample and nested user ids', () => {
    expect(isValidBackgroundPhotoId('sample/sample-1.svg')).toBe(true)
    expect(isValidBackgroundPhotoId('user/trips/night/photo 1.jpg')).toBe(true)
  })

  it('rejects foreign, empty, traversal, and backslash ids', () => {
    expect(isValidBackgroundPhotoId('https://example.com/a.jpg')).toBe(false)
    expect(isValidBackgroundPhotoId('sample/')).toBe(false)
    expect(isValidBackgroundPhotoId('user/../secret.jpg')).toBe(false)
    expect(isValidBackgroundPhotoId('user/a\\b.jpg')).toBe(false)
  })

  it('re-announces the persisted selection when the album view loads', () => {
    class TestCustomEvent<T = unknown> extends Event {
      readonly detail: T

      constructor(type: string, init?: CustomEventInit<T>) {
        super(type)
        this.detail = init?.detail as T
      }
    }
    const target = new EventTarget()
    vi.stubGlobal('window', target)
    vi.stubGlobal('CustomEvent', TestCustomEvent)
    const listener = vi.fn()
    window.addEventListener(PHOTO_ALBUM_BACKGROUND_EVENT, listener)
    emitBackgroundFromAlbumView({
      title: 'Album',
      source: 'samples',
      directory: '',
      columns: 4,
      backgroundPhotoId: 'sample/sample-1.svg',
      photos: [{ id: 'sample/sample-1.svg', name: 'Night', mtime: 0, size: 1 }],
    })
    expect(listener).toHaveBeenCalledOnce()
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      id: 'sample/sample-1.svg',
      name: 'Night',
    })
    window.removeEventListener(PHOTO_ALBUM_BACKGROUND_EVENT, listener)
  })
})
