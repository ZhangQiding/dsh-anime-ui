import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isImageFile, isPathInside, listImageFiles, mimeForFile, resolveInside } from './album.ts'

describe('isImageFile', () => {
  it('accepts the listed image extensions case-insensitively', () => {
    expect(isImageFile('a.JPG')).toBe(true)
    expect(isImageFile('b.webp')).toBe(true)
    expect(isImageFile('c.svg')).toBe(true)
  })

  it('rejects non-image names and extensionless names', () => {
    expect(isImageFile('notes.txt')).toBe(false)
    expect(isImageFile('noext')).toBe(false)
  })
})

describe('mimeForFile', () => {
  it('maps known extensions and falls back to octet-stream', () => {
    expect(mimeForFile('x.png')).toBe('image/png')
    expect(mimeForFile('x.svg')).toBe('image/svg+xml')
    expect(mimeForFile('x.unknown')).toBe('application/octet-stream')
  })
})

describe('isPathInside', () => {
  it('accepts equal and nested paths and rejects siblings', () => {
    expect(isPathInside('/a/b', '/a/b')).toBe(true)
    expect(isPathInside('/a/b', '/a/b/c')).toBe(true)
    expect(isPathInside('/a/b', '/a/bc')).toBe(false)
    expect(isPathInside('/a/b', '/a')).toBe(false)
  })
})

describe('resolveInside', () => {
  it('resolves a clean relative path', () => {
    expect(resolveInside('/root', 'a/b.jpg')).toBe(join('/root', 'a', 'b.jpg'))
  })

  it('rejects traversal and absolute paths', () => {
    expect(resolveInside('/root', '../secret.jpg')).toBeNull()
    expect(resolveInside('/root', 'a/../../secret.jpg')).toBeNull()
    expect(resolveInside('/root', '/etc/passwd')).toBeNull()
  })
})

describe('listImageFiles', () => {
  it('lists images newest-first and skips non-images and hidden entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-album-'))
    await mkdir(join(root, 'sub'))
    await writeFile(join(root, 'a.jpg'), 'a')
    await writeFile(join(root, 'b.txt'), 'b')
    await writeFile(join(root, '.hidden.png'), 'h')
    await writeFile(join(root, 'sub', 'c.PNG'), 'c')

    const top = await listImageFiles(root, false)
    expect(top.map(f => f.relPath)).toEqual(['a.jpg'])

    const all = await listImageFiles(root, true)
    expect(all.map(f => f.relPath).sort()).toEqual(['a.jpg', 'sub/c.PNG'])
    // Newest first: c.PNG was written last.
    expect(all[0]?.relPath).toBe('sub/c.PNG')
  })
})
