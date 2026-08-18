/**
 * Sidebar entry injection. The sidebar shell exposes no slot an external
 * plugin can register into, so — following the skin/task-board precedent of
 * DOM-level extension — the entry row is injected after the shell's New
 * Session button. The injection self-heals: a MutationObserver watches the
 * sidebar root and re-inserts the row whenever a React re-render displaces it.
 * The row is plain DOM so it never disturbs the shell's reconciliation.
 * @module dsh-photo-album/client/sidebar-entry
 */

import type { AlbumController } from './controller.ts'
import { t } from './locales.ts'

/** Stable data attribute identifying the injected entry row. */
export const ENTRY_SELECTOR = '[data-dsh-photoalbum-entry]'

/** Inline icon (matches the shell's 16px nav-icon look). */
const ICON = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><circle cx="5.5" cy="6" r="1.3"/><path d="M2.5 12.5l3.4-3.4 2.3 2.3 2.1-2.1 3.2 3.2"/></svg>`

/** Find the sidebar shell root element, or undefined while not yet mounted. */
function sidebarRoot(): HTMLElement | undefined {
  const column = document.querySelector<HTMLElement>('[data-pane="sidebar"], [class*="sidebarCol"]')
  if (column === null) return undefined
  const logoOwner = column.querySelector<HTMLElement>('[class*="logoRow"]')?.parentElement
  return logoOwner ?? (column.firstElementChild as HTMLElement | undefined)
}

/** The New Session button (nested in the logo row on current shells). */
function newSessionButton(root: HTMLElement): HTMLButtonElement | undefined {
  const nested = root.querySelector<HTMLButtonElement>('button[class*="newSession"]')
  if (nested !== null) return nested
  for (const child of root.children) {
    if (child.tagName === 'BUTTON') return child as HTMLButtonElement
  }
  return undefined
}

/** Build the entry row (a detached button). */
function createEntry(controller: AlbumController): HTMLButtonElement {
  const entry = document.createElement('button')
  entry.type = 'button'
  entry.dataset.dshPhotoalbumEntry = ''
  entry.className = 'dsh-pa-entry'
  entry.setAttribute('aria-label', t('entry.label'))
  entry.innerHTML = `<span class="dsh-pa-entry-icon">${ICON}</span><span class="dsh-pa-entry-label">${t('entry.label')}</span>`
  entry.addEventListener('click', () => { controller.toggle() })
  return entry
}

/** Re-insert the entry after the New Session row. */
function placeEntry(root: HTMLElement, entry: HTMLButtonElement): boolean {
  const button = newSessionButton(root)
  if (button === undefined) return false
  if (entry.parentElement !== root) {
    const row = button.closest('[class*="logoRow"]')
    const base = (row !== null && row.parentElement === root) ? row : button
    const family = Array.from(root.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.matches('[data-dsh-photoalbum-entry], [data-dsh-taskboard-entry], [data-dsh-ssh-entry]'),
    )
    const anchor = family.length > 0 ? family[0] : base.nextElementSibling
    root.insertBefore(entry, anchor)
  }
  return true
}

/**
 * Mount the sidebar entry, waiting for the shell to render and self-healing
 * on later React re-renders.
 * @param controller - the album controller the entry toggles.
 * @returns disposer removing the entry and its observers.
 */
export function mountSidebarEntry(controller: AlbumController): () => void {
  if (typeof document !== 'undefined' && document.querySelector(ENTRY_SELECTOR) !== null) {
    return () => {}
  }
  const entry = createEntry(controller)
  let root: HTMLElement | undefined
  let placed = false

  const tryPlace = (): void => {
    if (root !== undefined && !root.isConnected) {
      rootObserver.disconnect()
      root = undefined
      placed = false
    }
    if (placed) {
      if (document.body.contains(entry)) return
      rootObserver.disconnect()
      root = undefined
      placed = false
    }
    root ??= sidebarRoot()
    if (root === undefined) return
    placed = placeEntry(root, entry)
    if (placed) rootObserver.observe(root, { childList: true, subtree: true })
  }

  const waitObserver = new MutationObserver(() => { tryPlace() })
  waitObserver.observe(document.body, { childList: true, subtree: true })

  const rootObserver = new MutationObserver(() => {
    if (root === undefined || !root.isConnected) {
      placed = false
      tryPlace()
      return
    }
    if (!root.contains(entry)) placed = placeEntry(root, entry)
  })

  const syncActive = (): void => {
    if (controller.getSnapshot().open) entry.dataset.active = 'true'
    else delete entry.dataset.active
  }
  const unsubscribe = controller.subscribe(syncActive)
  syncActive()

  tryPlace()

  return () => {
    waitObserver.disconnect()
    rootObserver.disconnect()
    unsubscribe()
    entry.remove()
  }
}
