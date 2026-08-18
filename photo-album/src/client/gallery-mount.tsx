/**
 * Gallery view mounting. The `conversation` slot is single-occupant, so the
 * album takes over the center column at the DOM level: a container is appended
 * inside the center column as an extra trailing child React never manages, and
 * a stylesheet rule hides the conversation content while the album is active.
 * Toggling is a data attribute on <html> — the conversation subtree underneath
 * stays mounted and stateful.
 * @module dsh-photo-album/client/gallery-mount
 */

import { createRoot, type Root } from 'react-dom/client'
import type { AlbumController } from './controller.ts'
import { AlbumGallery, type AlbumGalleryDeps } from './PhotoAlbum.tsx'

/** The injected gallery container (kept in the DOM, hidden when inactive). */
export const GALLERY_VIEW_SELECTOR = '[data-dsh-photoalbum-view]'

const CONVERSATION_COLUMN_SELECTOR = '[data-pane="conversation"], [class*="centerCol"]'
const ACTIVE_ATTR = 'data-dsh-photoalbum-active'
/** Sibling panels' activation attributes, removed when this panel opens. */
const OTHER_ACTIVE_ATTRS = ['data-dsh-taskboard-active', 'data-dsh-ssh-active']
/** Cross-plugin activation event; detail is the activating panel name. */
const ACTIVATE_EVENT = 'dsh-panel-activate'
const PANEL_NAME = 'photoalbum'

/** Find the center column, or undefined while the frame is not mounted. */
function conversationColumn(): HTMLElement | undefined {
  return document.querySelector<HTMLElement>(CONVERSATION_COLUMN_SELECTOR) ?? undefined
}

/**
 * Mount the gallery React tree into the center column and bind its visibility
 * to the controller's open state.
 * @param controller - the album controller driving the view.
 * @param deps - host-facing pick deps (directory picker + plugin-state write).
 * @returns disposer unmounting the tree and restoring the column.
 */
export function mountGallery(controller: AlbumController, deps: AlbumGalleryDeps): () => void {
  let root: Root | undefined
  let container: HTMLDivElement | undefined

  const ensure = (): void => {
    if (container !== undefined) return
    const column = conversationColumn()
    if (column === undefined) return
    container = document.createElement('div')
    container.dataset.dshPhotoalbumView = ''
    column.appendChild(container)
    root = createRoot(container)
    root.render(<AlbumGallery controller={controller} deps={deps} />)
  }

  const waitObserver = new MutationObserver(() => { ensure() })
  waitObserver.observe(document.body, { childList: true, subtree: true })

  const applyActive = (): void => {
    if (controller.getSnapshot().open) {
      // Single-occupant center column: opening this panel evicts the sibling
      // panels (task board / ssh) so their visibility rules do not fight.
      for (const attr of OTHER_ACTIVE_ATTRS) document.documentElement.removeAttribute(attr)
      document.documentElement.setAttribute(ACTIVE_ATTR, '')
      document.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: PANEL_NAME }))
    } else {
      document.documentElement.removeAttribute(ACTIVE_ATTR)
    }
  }
  const onOtherActivate = (event: Event): void => {
    const detail = (event as CustomEvent).detail as string | undefined
    if (detail !== undefined && detail !== PANEL_NAME && controller.getSnapshot().open) {
      controller.close()
    }
  }
  // Hand the center column back to the conversation on sidebar context clicks.
  const SIDEBAR_ROW_SELECTOR = '[class*="sessionRow"], [class*="projectRow"], [class*="searchResultRow"], [class*="searchResultWorkspace"], [class*="newSession"]'
  const onClickSidebarRow = (event: MouseEvent): void => {
    if (!controller.getSnapshot().open) return
    const target = event.target as HTMLElement | null
    if (target === null) return
    if (target.closest(SIDEBAR_ROW_SELECTOR) !== null) controller.close()
  }
  document.addEventListener('click', onClickSidebarRow, true)
  document.addEventListener(ACTIVATE_EVENT, onOtherActivate)
  const unsubscribe = controller.subscribe(applyActive)
  applyActive()
  ensure()

  return () => {
    document.removeEventListener('click', onClickSidebarRow, true)
    document.removeEventListener(ACTIVATE_EVENT, onOtherActivate)
    waitObserver.disconnect()
    unsubscribe()
    document.documentElement.removeAttribute(ACTIVE_ATTR)
    root?.unmount()
    root = undefined
    container?.remove()
    container = undefined
  }
}
