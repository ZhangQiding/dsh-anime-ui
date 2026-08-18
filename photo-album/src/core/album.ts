/**
 * Photo scanning: list image files under a directory, resolve mime types, and
 * guard an absolute path inside a root. Pure Node fs work, kept free of cordis
 * so it can be unit-tested without a harness.
 * @module dsh-photo-album/core/album
 */

import { readdir, stat } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'

/** Image extensions the album lists, lower-cased without the dot. */
export const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp',
])

/** Mime type by extension (the common browser-renderable set). */
const MIME_BY_EXT: Readonly<Record<string, string>> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
}

/** One image file found by a scan. */
export interface ImageFile {
  /** Path relative to the scanned root, `/`-separated. */
  relPath: string
  /** Bare filename. */
  name: string
  /** Last-modified time, epoch ms. */
  mtime: number
  /** File size in bytes. */
  size: number
}

/** Whether a filename carries an image extension the album lists. */
export function isImageFile(name: string): boolean {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return false
  return IMAGE_EXTENSIONS.has(name.slice(dot + 1).toLowerCase())
}

/** Content type for a file path; octet-stream for unknown extensions. */
export function mimeForFile(file: string): string {
  const dot = file.lastIndexOf('.')
  if (dot < 0) return 'application/octet-stream'
  return MIME_BY_EXT[file.slice(dot).toLowerCase()] ?? 'application/octet-stream'
}

/** Normalize a path for prefix comparison: `/` separators, no trailing slash. */
function normalizeForPrefix(value: string): string {
  return value.replaceAll('\\', '/').replace(/\/+$/, '')
}

/** Whether `child` is inside (or equal to) `root`, separator-robust. */
export function isPathInside(root: string, child: string): boolean {
  if (root === '' || child === '') return false
  const normRoot = normalizeForPrefix(root)
  const normChild = normalizeForPrefix(child)
  if (normChild === normRoot) return true
  return normChild.startsWith(`${normRoot}/`)
}

/**
 * Recursively list image files under `root`, newest first. Hidden entries
 * (name starting with `.`) and symlinked directories are skipped. A
 * non-recursive scan only reads the top level.
 * @param root - directory to scan (must exist).
 * @param recursive - descend into subdirectories.
 * @returns image files, sorted by mtime descending.
 */
export async function listImageFiles(root: string, recursive: boolean): Promise<ImageFile[]> {
  const files: ImageFile[] = []
  const walk = async (dir: string, base: string): Promise<void> => {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      // An unreadable subdirectory is skipped, not fatal to the whole album.
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const abs = join(dir, entry.name)
      const rel = base === '' ? entry.name : `${base}/${entry.name}`
      if (entry.isDirectory()) {
        if (recursive) await walk(abs, rel)
        continue
      }
      if (!entry.isFile() || !isImageFile(entry.name)) continue
      try {
        const info = await stat(abs)
        if (!info.isFile()) continue
        files.push({ relPath: rel, name: entry.name, mtime: info.mtimeMs, size: info.size })
      } catch {
        // The file vanished between readdir and stat; skip it.
      }
    }
  }
  await walk(root, '')
  files.sort((a, b) => b.mtime - a.mtime)
  return files
}

/**
 * Resolve a scanned root to an absolute path for a `/`-separated relative
 * path, rejecting anything that escapes the root. Returns the absolute path or
 * null when the child is outside the root.
 * @param root - the scanned directory.
 * @param relPath - `/`-separated relative path.
 */
export function resolveInside(root: string, relPath: string): string | null {
  if (relPath.includes('\0')) return null
  // Reject `..` segments and absolute/UNC paths before touching the filesystem.
  const segments = relPath.split('/')
  if (segments.some(segment => segment === '..' || segment === '' || segment === '.')) return null
  if (relPath.startsWith('/') || /^[A-Za-z]:/.test(relPath)) return null
  const abs = resolve(root, ...segments)
  return isPathInside(resolve(root), abs) ? abs : null
}

/** Bare filename for display, tolerant of both separators. */
export function displayName(relPath: string): string {
  return basename(relPath.split('/').pop() ?? relPath)
}

/** Resolve a possibly-relative directory against the process cwd. */
export function resolveDir(dir: string): string {
  return resolve(dir)
}
