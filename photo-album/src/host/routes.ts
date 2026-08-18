/**
 * /api/photo-album/* routes: one JSON endpoint for the album view and one
 * media endpoint streaming photo bytes. Every request is loopback-fenced first,
 * so a LAN-exposed deployment cannot enumerate or read photo files.
 * @module dsh-photo-album/host/routes
 */

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { pipeline } from 'node:stream/promises'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { AlbumEnvelope, AlbumError } from '../core/types.ts'
import { isLoopbackRequest } from './loopback.ts'
import type { PhotoAlbumService } from './service.ts'

const OK = <T>(value: T): AlbumEnvelope<T> => ({ ok: true, value })
const FAIL = (error: AlbumError): AlbumEnvelope<never> => ({ ok: false, error })

const BAD_REQUEST: AlbumError = { code: 'bad-request', message: 'malformed request' }
const NOT_FOUND: AlbumError = { code: 'not-found', message: 'photo not found' }
const MAX_JSON_BYTES = 4096

/** Write one JSON envelope response. */
function json(res: ServerResponse, envelope: AlbumEnvelope<unknown>, status = 200): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(envelope))
}

/** Write the shared non-loopback rejection. */
function forbidden(res: ServerResponse): void {
  res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ error: 'forbidden: loopback-only' }))
}

/** Stream one photo with an etag + no-cache so re-renders revalidate cheaply. */
async function serveMedia(service: PhotoAlbumService, req: IncomingMessage, url: URL, res: ServerResponse): Promise<void> {
  const id = url.searchParams.get('id')
  if (id === null || id === '') {
    json(res, FAIL(BAD_REQUEST), 400)
    return
  }
  const resolved = await service.resolveMedia(id)
  if (!resolved.ok) {
    json(res, FAIL(resolved.error), 404)
    return
  }
  const info = await stat(resolved.abs)
  const etag = `W/"${info.size}-${Math.floor(info.mtimeMs)}"`
  const lastModified = new Date(info.mtimeMs).toUTCString()
  const headers: Record<string, string | number> = {
    'content-type': resolved.mime,
    'content-length': info.size,
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
    etag,
    'last-modified': lastModified,
  }
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers)
    res.end()
    return
  }
  if (req.method === 'HEAD') {
    res.writeHead(200, headers)
    res.end()
    return
  }
  res.writeHead(200, headers)
  try {
    await pipeline(createReadStream(resolved.abs), res)
  } catch {
    // Client aborted mid-stream or the file vanished after stat.
    res.destroy()
  }
}

/** Read one deliberately small JSON request body. */
async function readJson(req: IncomingMessage): Promise<unknown> {
  const mediaType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase()
  if (mediaType !== 'application/json') throw new Error('content type must be application/json')
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_JSON_BYTES) throw new Error('request body too large')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

/** Persist a background id (or null reset) and return the refreshed view. */
async function setBackground(service: PhotoAlbumService, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson(req)
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    json(res, FAIL(BAD_REQUEST), 400)
    return
  }
  const id = (body as Record<string, unknown>).id
  if (id !== null && typeof id !== 'string') {
    json(res, FAIL(BAD_REQUEST), 400)
    return
  }
  try {
    json(res, OK(await service.setBackgroundPhotoId(id)))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    json(res, FAIL(message === 'photo not found' ? NOT_FOUND : { code: 'internal', message }), message === 'photo not found' ? 404 : 500)
  }
}

/** Persist the picked photo directory and return the refreshed view. */
async function setDirectory(service: PhotoAlbumService, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson(req)
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    json(res, FAIL(BAD_REQUEST), 400)
    return
  }
  const path = (body as Record<string, unknown>).path
  if (typeof path !== 'string' || path.trim() === '') {
    json(res, FAIL(BAD_REQUEST), 400)
    return
  }
  try {
    json(res, OK(await service.setPhotosDir(path)))
  } catch (error) {
    json(res, FAIL({ code: 'internal', message: error instanceof Error ? error.message : String(error) }), 500)
  }
}

/**
 * Register the album routes on the shared webserver.
 * @param ctx - context carrying the webServer service.
 * @param service - the album service backing the routes.
 * @returns disposers removing the routes.
 */
export function registerAlbumRoutes(ctx: Context, service: PhotoAlbumService): () => void {
  const handler = (req: IncomingMessage, res: ServerResponse): void => {
    if (!isLoopbackRequest(req)) {
      forbidden(res)
      return
    }
    const method = req.method ?? 'GET'
    let pathname: string
    try {
      pathname = new URL(req.url ?? '/', 'http://photo-album.local').pathname
    } catch {
      res.writeHead(400)
      res.end()
      return
    }
    const url = new URL(req.url ?? '/', 'http://photo-album.local')
    if (pathname === '/api/photo-album/list') {
      if (method !== 'GET' && method !== 'HEAD') {
        res.writeHead(405)
        res.end()
        return
      }
      void service.list().then(
        value => json(res, OK(value)),
        (error: unknown) => json(res, FAIL({ code: 'internal', message: error instanceof Error ? error.message : String(error) }), 500),
      )
      return
    }
    if (pathname === '/api/photo-album/media') {
      if (method !== 'GET' && method !== 'HEAD') {
        res.writeHead(405)
        res.end()
        return
      }
      void serveMedia(service, req, url, res).catch(() => {
        if (!res.headersSent) json(res, FAIL(NOT_FOUND), 404)
      })
      return
    }
    if (pathname === '/api/photo-album/background') {
      if (method !== 'POST') {
        res.writeHead(405)
        res.end()
        return
      }
      void setBackground(service, req, res).catch(() => json(res, FAIL(BAD_REQUEST), 400))
      return
    }
    if (pathname === '/api/photo-album/directory') {
      if (method !== 'POST') {
        res.writeHead(405)
        res.end()
        return
      }
      void setDirectory(service, req, res).catch(() => json(res, FAIL(BAD_REQUEST), 400))
      return
    }
    res.writeHead(404)
    res.end()
  }

  const dispose = ctx.webServer.register({ kind: 'prefix', path: '/api/photo-album', handler })
  return () => {
    dispose()
  }
}
