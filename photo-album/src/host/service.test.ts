import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PhotoAlbumService, type AlbumConfig } from './service.ts'
import { AlbumStateStore } from './state-store.ts'

describe('PhotoAlbumService background selection', () => {
  it('publishes a persisted selection only while it belongs to the current album', async () => {
    const samplesDir = await mkdtemp(join(tmpdir(), 'dsh-album-samples-'))
    await writeFile(join(samplesDir, 'sample.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
    const config: AlbumConfig = { backgroundPhotoId: 'sample/sample.svg' }
    const service = new PhotoAlbumService({ getConfig: () => config, samplesDir })

    await expect(service.list()).resolves.toMatchObject({
      backgroundPhotoId: 'sample/sample.svg',
      photos: [{ id: 'sample/sample.svg' }],
    })

    config.backgroundPhotoId = 'sample/missing.svg'
    const stale = await service.list()
    expect(stale.backgroundPhotoId).toBeUndefined()
  })

  it('persists a gallery selection across service instances and clears it with null', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-album-persist-'))
    const samplesDir = join(root, 'samples')
    const statePath = join(root, 'state.json')
    await mkdir(samplesDir)
    await writeFile(join(samplesDir, 'night.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')

    const first = new PhotoAlbumService({
      getConfig: () => ({}),
      samplesDir,
      stateStore: new AlbumStateStore(statePath),
    })
    await first.setBackgroundPhotoId('sample/night.svg')

    const restarted = new PhotoAlbumService({
      getConfig: () => ({}),
      samplesDir,
      stateStore: new AlbumStateStore(statePath),
    })
    await expect(restarted.list()).resolves.toMatchObject({ backgroundPhotoId: 'sample/night.svg' })

    await restarted.setBackgroundPhotoId(null)
    expect((await restarted.list()).backgroundPhotoId).toBeUndefined()
  })

  it('serves photos from a directory chosen through plugin-owned state', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-album-directory-'))
    const samplesDir = join(root, 'samples')
    const photosDir = join(root, 'photos')
    const statePath = join(root, 'state.json')
    await mkdir(samplesDir)
    await mkdir(photosDir)
    await writeFile(join(samplesDir, 'sample.svg'), '<svg/>')
    await writeFile(join(photosDir, 'night.jpg'), 'fixture')

    const service = new PhotoAlbumService({
      getConfig: () => ({}),
      samplesDir,
      stateStore: new AlbumStateStore(statePath),
    })
    await service.setPhotosDir(photosDir)
    await expect(service.list()).resolves.toMatchObject({
      source: 'directory',
      directory: photosDir,
      photos: [{ id: 'user/night.jpg' }],
    })
    await expect(service.resolveMedia('user/night.jpg')).resolves.toMatchObject({
      ok: true,
      abs: join(photosDir, 'night.jpg'),
      mime: 'image/jpeg',
    })
  })
})
