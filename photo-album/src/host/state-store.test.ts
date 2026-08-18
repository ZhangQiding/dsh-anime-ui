import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AlbumStateStore, defaultAlbumImportsPath, defaultAlbumStatePath } from './state-store.ts'

describe('AlbumStateStore', () => {
  it('stores directory and background choices atomically and supports reset', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-album-state-'))
    const filename = join(root, 'nested', 'dsh-photo-album.json')
    const store = new AlbumStateStore(filename)

    await store.update({ photosDir: '/photos', backgroundPhotoId: 'user/night.jpg' })
    await expect(store.read()).resolves.toEqual({
      photosDir: '/photos',
      backgroundPhotoId: 'user/night.jpg',
    })

    await store.update({ backgroundPhotoId: null })
    await expect(store.read()).resolves.toEqual({ photosDir: '/photos' })
    await expect(readFile(filename, 'utf8')).resolves.toContain('"version": 1')
  })

  it('uses the effective DSH_HOME and falls back to ~/.dsh', () => {
    expect(defaultAlbumStatePath({ DSH_HOME: '/custom/dsh' }, '/home/user'))
      .toBe('/custom/dsh/storages/dsh-photo-album.json')
    expect(defaultAlbumStatePath({}, '/home/user'))
      .toBe('/home/user/.dsh/storages/dsh-photo-album.json')
    expect(defaultAlbumImportsPath({ DSH_HOME: '/custom/dsh' }, '/home/user'))
      .toBe('/custom/dsh/storages/dsh-photo-album/photos')
  })
})
