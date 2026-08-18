/**
 * Minimal open/close observable for the album view. The sidebar entry toggles
 * it; the gallery mount binds the center-column visibility to it. Framework
 * free so the DOM-injected entry and the React gallery share one source.
 * @module dsh-photo-album/client/controller
 */

/** The album view's open/closed state. */
export interface AlbumControllerState {
  open: boolean
}

/** Small observable controller over the album view's open state. */
export class AlbumController {
  private state: AlbumControllerState = { open: false }
  private readonly listeners = new Set<() => void>()

  /** Current snapshot (stable reference until the next change). */
  getSnapshot(): AlbumControllerState {
    return this.state
  }

  /** Observe state changes; returns the disposer. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Toggle the album view. */
  toggle(): void {
    this.setState({ open: !this.state.open })
  }

  /** Open the album view. */
  open(): void {
    this.setState({ open: true })
  }

  /** Close the album view. */
  close(): void {
    this.setState({ open: false })
  }

  private setState(next: AlbumControllerState): void {
    this.state = next
    for (const listener of this.listeners) listener()
  }
}
