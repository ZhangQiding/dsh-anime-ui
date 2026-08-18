/**
 * The album gallery: a responsive photo grid plus a keyboard-navigable
 * lightbox. Fetches the album view from the host on mount and re-fetches each
 * time the view opens, so a settings change is picked up without a reload.
 * @module dsh-photo-album/client/PhotoAlbum
 */

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import type { AlbumView } from '../core/types.ts'
import { fetchAlbum, mediaUrl } from './api.ts'
import { emitBackgroundChange, emitBackgroundFromAlbumView } from './background-selection.ts'
import type { AlbumController } from './controller.ts'
import { t } from './locales.ts'

/** Host-facing deps the gallery uses to let the operator pick a photo folder. */
export interface AlbumGalleryDeps {
  /** Open the host's native directory picker; null = cancelled. */
  pickDirectory: () => Promise<string | null>
  /** Persist the picked directory as the album's photo source. */
  setPhotosDir: (path: string) => Promise<void>
  /** Copy a selected PNG/JPEG locally and immediately make it the background. */
  importPhoto: (file: File) => Promise<AlbumView>
  /** Persist the selected photo id; an empty string restores the skin default. */
  setBackgroundPhotoId: (id: string) => Promise<void>
}

/**
 * Render the album gallery.
 * @param props - the controller owning the view's open state and the pick deps.
 */
export function AlbumGallery({ controller, deps }: { controller: AlbumController; deps: AlbumGalleryDeps }): React.ReactElement {
  const [album, setAlbum] = useState<AlbumView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState<number | null>(null)
  const [choosing, setChoosing] = useState(false)
  const [chooseError, setChooseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [backgroundId, setBackgroundId] = useState<string | null>(null)
  const [backgroundBusy, setBackgroundBusy] = useState<string | null>(null)
  const [backgroundError, setBackgroundError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await fetchAlbum()
    if (result.ok) {
      setAlbum(result.value)
      setBackgroundId(result.value.backgroundPhotoId ?? null)
      emitBackgroundFromAlbumView(result.value)
      setError(null)
    } else {
      setAlbum(null)
      setError(result.error.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    // Re-fetch when the view opens so a directory change is picked up live.
    return controller.subscribe(() => {
      if (controller.getSnapshot().open) void load()
    })
  }, [controller, load])

  // Lightbox keyboard navigation + Esc to close.
  useEffect(() => {
    if (index === null || album === null) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIndex(null)
      } else if (event.key === 'ArrowRight') {
        setIndex(prev => prev === null ? prev : (prev + 1) % album.photos.length)
      } else if (event.key === 'ArrowLeft') {
        setIndex(prev => prev === null ? prev : (prev - 1 + album.photos.length) % album.photos.length)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey) }
  }, [index, album])

  const choose = useCallback(async () => {
    setChooseError(null)
    setChoosing(true)
    try {
      const path = await deps.pickDirectory()
      if (path !== null && path !== '') {
        await deps.setPhotosDir(path)
        await load()
      }
    } catch (err) {
      setChooseError(err instanceof Error ? err.message : String(err))
    } finally {
      setChoosing(false)
    }
  }, [deps, load])

  const importSelectedPhoto = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (file === undefined) return
    setImportError(null)
    setImporting(true)
    try {
      const view = await deps.importPhoto(file)
      setAlbum(view)
      setBackgroundId(view.backgroundPhotoId ?? null)
      emitBackgroundFromAlbumView(view)
      setError(null)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(false)
    }
  }, [deps])

  const photos = album?.photos ?? []
  const columns = album?.columns ?? 4
  const showSamples = album?.source === 'samples'

  const selectBackground = useCallback(async (id: string, name: string) => {
    setBackgroundError(null)
    setBackgroundBusy(id)
    try {
      await deps.setBackgroundPhotoId(id)
      setBackgroundId(id)
      emitBackgroundChange({ id, name })
    } catch (err) {
      setBackgroundError(err instanceof Error ? err.message : String(err))
    } finally {
      setBackgroundBusy(null)
    }
  }, [deps])

  const resetBackground = useCallback(async () => {
    setBackgroundError(null)
    setBackgroundBusy('')
    try {
      await deps.setBackgroundPhotoId('')
      setBackgroundId(null)
      emitBackgroundChange({ id: null })
    } catch (err) {
      setBackgroundError(err instanceof Error ? err.message : String(err))
    } finally {
      setBackgroundBusy(null)
    }
  }, [deps])

  return (
    <div className="dsh-pa-album" data-dsh-photoalbum-root="">
      <header className="dsh-pa-album-header">
        <div className="dsh-pa-album-header-text">
          <h1 className="dsh-pa-album-title">{album?.title ?? t('entry.label')}</h1>
          {album?.source === 'directory' && album.directory !== ''
            ? <p className="dsh-pa-album-subtitle">{t('gallery.directoryHint', { dir: album.directory })}</p>
            : null}
        </div>
        <div className="dsh-pa-album-actions">
          <input
            ref={fileInput}
            className="dsh-pa-file-input"
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            onChange={(event) => { void importSelectedPhoto(event) }}
          />
          <button
            type="button"
            className="dsh-pa-import"
            disabled={importing || backgroundBusy !== null}
            onClick={() => { fileInput.current?.click() }}
          >
            {importing ? t('gallery.importingPhoto') : t('gallery.importPhoto')}
          </button>
          {backgroundId !== null
            ? <button type="button" className="dsh-pa-background-reset" disabled={backgroundBusy !== null} onClick={() => { void resetBackground() }}>{t('gallery.resetBackground')}</button>
            : null}
          <span className="dsh-pa-album-count">{t('gallery.count', { n: photos.length })}</span>
          <button type="button" className="dsh-pa-refresh" onClick={() => { void load() }} aria-label="refresh">↻</button>
          <button type="button" className="dsh-pa-album-close" onClick={() => { controller.close() }} aria-label={t('lightbox.close')}>×</button>
        </div>
      </header>

      {showSamples && !loading && error === null
        ? (
          <div className="dsh-pa-samples-callout">
            <span className="dsh-pa-samples-copy">
              <span className="dsh-pa-samples-text">{t('gallery.samplesHint')}</span>
              <span className="dsh-pa-formats-hint">{t('gallery.formatsHint')}</span>
            </span>
            <button type="button" className="dsh-pa-choose" disabled={choosing} onClick={() => { void choose() }}>
              {choosing ? '…' : t('gallery.chooseDirectory')}
            </button>
          </div>
        )
        : null}

      {chooseError !== null
        ? <p className="dsh-pa-invalid">{t('gallery.chooseError', { error: chooseError })}</p>
        : null}

      {importError !== null
        ? <p className="dsh-pa-invalid">{t('gallery.importError', { error: importError })}</p>
        : null}

      {backgroundError !== null
        ? <p className="dsh-pa-invalid">{t('gallery.backgroundError', { error: backgroundError })}</p>
        : null}

      {album?.warning
        ? <p className="dsh-pa-warning">{t('gallery.warning', { warning: album.warning })}</p>
        : null}

      {loading
        ? <p className="dsh-pa-status">{t('gallery.loading')}</p>
        : error !== null
          ? <p className="dsh-pa-status">{error}</p>
          : photos.length === 0
            ? (
              <div className="dsh-pa-empty">
                <p>{t('gallery.empty')}</p>
                <button type="button" className="dsh-pa-choose" disabled={choosing} onClick={() => { void choose() }}>
                  {choosing ? '…' : t('gallery.chooseDirectory')}
                </button>
              </div>
            )
            : (
              <ul className="dsh-pa-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {photos.map((photo, i) => (
                  <li key={photo.id} className="dsh-pa-cell" data-dsh-photoalbum-background-active={backgroundId === photo.id ? '' : undefined}>
                    <button type="button" className="dsh-pa-photo-button" onClick={() => { setIndex(i) }}>
                      <img
                        className="dsh-pa-photo"
                        src={mediaUrl(photo.id)}
                        alt={photo.name}
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="dsh-pa-photo-name">{photo.name}</span>
                    </button>
                    <button
                      type="button"
                      className="dsh-pa-set-background"
                      disabled={backgroundBusy !== null || backgroundId === photo.id}
                      onClick={() => { void selectBackground(photo.id, photo.name) }}
                    >
                      {backgroundBusy === photo.id
                        ? t('gallery.applyingBackground')
                        : backgroundId === photo.id
                          ? t('gallery.backgroundActive')
                          : t('gallery.setBackground')}
                    </button>
                  </li>
                ))}
              </ul>
            )}

      {index !== null && photos[index] !== undefined
        ? (
          <div className="dsh-pa-lightbox" role="dialog" aria-modal="true" onClick={() => { setIndex(null) }}>
            <div className="dsh-pa-lightbox-stage" onClick={(event) => { event.stopPropagation() }}>
              <img className="dsh-pa-lightbox-image" src={mediaUrl(photos[index]!.id)} alt={photos[index]!.name} />
              <span className="dsh-pa-lightbox-caption">
                <span>{photos[index]!.name}</span>
                <span className="dsh-pa-lightbox-counter">{t('lightbox.counter', { current: index + 1, total: photos.length })}</span>
              </span>
            </div>
            <button type="button" className="dsh-pa-lightbox-nav dsh-pa-lightbox-prev" aria-label={t('lightbox.prev')} onClick={(event) => { event.stopPropagation(); setIndex((index - 1 + photos.length) % photos.length) }}>‹</button>
            <button type="button" className="dsh-pa-lightbox-nav dsh-pa-lightbox-next" aria-label={t('lightbox.next')} onClick={(event) => { event.stopPropagation(); setIndex((index + 1) % photos.length) }}>›</button>
            <button type="button" className="dsh-pa-lightbox-close" aria-label={t('lightbox.close')} onClick={(event) => { event.stopPropagation(); setIndex(null) }}>×</button>
            <button
              type="button"
              className="dsh-pa-lightbox-background"
              disabled={backgroundBusy !== null || backgroundId === photos[index]!.id}
              onClick={(event) => { event.stopPropagation(); void selectBackground(photos[index]!.id, photos[index]!.name) }}
            >
              {backgroundBusy === photos[index]!.id
                ? t('gallery.applyingBackground')
                : backgroundId === photos[index]!.id
                  ? t('gallery.backgroundActive')
                  : t('gallery.setBackground')}
            </button>
          </div>
        )
        : null}
    </div>
  )
}
