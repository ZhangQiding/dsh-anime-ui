/**
 * Photo-album stylesheet, shipped as a string and injected once into a
 * `<style>` tag at apply time. Class names are prefixed `dsh-pa-` and the
 * center-column takeover rules are scoped by data attributes, so nothing leaks
 * into the rest of the GUI. Colors ride the dsh `--dsw-*` tokens so the album
 * follows the active theme.
 * @module dsh-photo-album/client/styles
 */

export const ALBUM_CSS = `
/* --- center-column takeover (attribute-scoped) -------------------------------- */
[data-pane='conversation'],
[class*='centerCol'] {
  position: relative;
}
[data-dsh-photoalbum-view] {
  position: absolute;
  inset: 0;
  display: none;
  z-index: 60;
  overflow: auto;
  background: var(--dsw-alias-bg-base);
}
html[data-dsh-photoalbum-active]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [data-dsh-photoalbum-view] {
  display: block;
}
html[data-dsh-photoalbum-active]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [data-pane='conversation'] > :not([data-dsh-photoalbum-view]),
html[data-dsh-photoalbum-active]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [class*='centerCol'] > :not([data-dsh-photoalbum-view]) {
  display: none !important;
}

/* --- sidebar entry row -------------------------------------------------------- */
.dsh-pa-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 32px;
  padding: 0 12px;
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  line-height: 1;
}
.dsh-pa-entry:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
}
.dsh-pa-entry[data-active] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
}
.dsh-pa-entry-icon {
  display: inline-flex;
  align-items: center;
  flex: none;
}
.dsh-pa-entry-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --- gallery body ------------------------------------------------------------- */
.dsh-pa-album {
  min-height: 100%;
  padding: 20px 24px 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dsh-pa-album-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  justify-content: space-between;
}
.dsh-pa-album-header-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dsh-pa-album-title {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}
.dsh-pa-album-subtitle {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
}
.dsh-pa-album-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  flex: none;
}
.dsh-pa-file-input {
  display: none;
}
.dsh-pa-import {
  appearance: none;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-brand-primary);
  border-radius: 8px;
  color: var(--dsw-alias-label-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
.dsh-pa-import:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent);
}
.dsh-pa-import:disabled {
  cursor: default;
  opacity: 0.55;
}
.dsh-pa-album-count {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.dsh-pa-refresh,
.dsh-pa-album-close {
  appearance: none;
  font: inherit;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 15px;
  line-height: 1;
}
.dsh-pa-refresh:hover,
.dsh-pa-album-close:hover {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-label-dimmed);
}
.dsh-pa-warning {
  margin: 0;
  color: var(--dsw-alias-state-warn-primary);
  font-size: 12px;
  line-height: 1.5;
}
.dsh-pa-status {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
}
.dsh-pa-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
}
.dsh-pa-samples-callout {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2);
}
.dsh-pa-samples-text {
  flex: 1;
  min-width: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-samples-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.dsh-pa-formats-hint {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 1.4;
}
.dsh-pa-choose {
  appearance: none;
  font: inherit;
  cursor: pointer;
  flex: none;
  height: 34px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-bg-layer-3);
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-choose:hover:not(:disabled) {
  opacity: 0.9;
}
.dsh-pa-choose:disabled {
  opacity: 0.4;
  cursor: default;
}
.dsh-pa-hint {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1.5;
}
.dsh-pa-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.dsh-pa-cell {
  position: relative;
  margin: 0;
  padding: 0 0 34px;
  border-radius: 10px;
}
.dsh-pa-cell[data-dsh-photoalbum-background-active] {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
.dsh-pa-photo-button {
  appearance: none;
  font: inherit;
  cursor: pointer;
  width: 100%;
  border: 0;
  border-radius: 10px;
  padding: 0;
  background: transparent;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.dsh-pa-photo-button:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
.dsh-pa-photo {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  background: var(--dsw-alias-bg-layer-2);
  display: block;
}
.dsh-pa-photo-name {
  padding: 6px 4px 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: 100%;
  text-align: left;
}
.dsh-pa-set-background,
.dsh-pa-background-reset,
.dsh-pa-lightbox-background {
  appearance: none;
  border: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-3);
  cursor: pointer;
  font: inherit;
}
.dsh-pa-set-background:disabled,
.dsh-pa-background-reset:disabled,
.dsh-pa-lightbox-background:disabled {
  cursor: default;
  opacity: 0.62;
}
.dsh-pa-set-background {
  position: absolute;
  right: 4px;
  bottom: 2px;
  left: 4px;
  min-height: 28px;
  border-radius: 8px;
  font-size: 11px;
}
.dsh-pa-background-reset {
  min-height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 12px;
}

/* --- lightbox ----------------------------------------------------------------- */
.dsh-pa-lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dsh-pa-lightbox-stage {
  position: relative;
  max-width: calc(100vw - 120px);
  max-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dsh-pa-lightbox-image {
  max-width: 100%;
  max-height: calc(100vh - 120px);
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}
.dsh-pa-lightbox-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #fff;
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-lightbox-counter {
  white-space: nowrap;
  opacity: 0.7;
}
.dsh-pa-lightbox-nav,
.dsh-pa-lightbox-close {
  appearance: none;
  cursor: pointer;
  border: 0;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dsh-pa-lightbox-background {
  position: absolute;
  right: 24px;
  bottom: 20px;
  min-height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  color: #fff;
  background: rgba(20, 20, 24, 0.82);
  border-color: rgba(255, 255, 255, 0.2);
}
.dsh-pa-lightbox-nav:hover,
.dsh-pa-lightbox-close:hover {
  background: rgba(255, 255, 255, 0.22);
}
.dsh-pa-lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  font-size: 26px;
  line-height: 1;
}
.dsh-pa-lightbox-prev {
  left: 24px;
}
.dsh-pa-lightbox-next {
  right: 24px;
}
.dsh-pa-lightbox-close {
  position: absolute;
  top: 20px;
  right: 24px;
  width: 40px;
  height: 40px;
  font-size: 22px;
  line-height: 1;
}

/* --- settings card ------------------------------------------------------------- */
.dsh-pa-section-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.dsh-pa-card {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  border-radius: 12px;
  list-style: none;
}
.dsh-pa-header-static {
  width: 100%;
  border-radius: 12px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  display: flex;
}
.dsh-pa-head-text {
  flex-direction: column;
  flex: 1;
  gap: 4px;
  min-width: 0;
  display: flex;
}
.dsh-pa-name {
  color: var(--dsw-alias-label-primary);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}
.dsh-pa-description {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-pending {
  white-space: nowrap;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 999px;
  flex: none;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
}
.dsh-pa-body {
  border-top: 1px solid var(--dsw-alias-border-l2);
  margin: 0 16px;
  padding-bottom: 8px;
}
.dsh-pa-read-only {
  color: var(--dsw-alias-label-tertiary);
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.5;
}
.dsh-pa-footer {
  border-top: 1px solid var(--dsw-alias-border-l2);
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 12px 0 4px;
  display: flex;
}
.dsh-pa-failed {
  min-width: 0;
  color: var(--dsw-alias-label-error);
  flex: 1;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.dsh-pa-discard,
.dsh-pa-save {
  appearance: none;
  font: inherit;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 5px 14px;
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-discard {
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-secondary);
  background: transparent;
}
.dsh-pa-discard:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-label-dimmed);
}
.dsh-pa-save {
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-bg-layer-3);
}
.dsh-pa-discard:disabled,
.dsh-pa-save:disabled {
  opacity: 0.4;
  cursor: default;
}
.dsh-pa-field {
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
  display: flex;
}
.dsh-pa-field + .dsh-pa-field {
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.dsh-pa-head {
  align-items: center;
  gap: 8px;
  display: flex;
}
.dsh-pa-label {
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}
.dsh-pa-badges {
  align-items: center;
  gap: 8px;
  display: inline-flex;
}
.dsh-pa-badge {
  white-space: nowrap;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
}
.dsh-pa-reset {
  font: inherit;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  font-size: 12px;
  line-height: 1.5;
}
.dsh-pa-reset:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary);
}
.dsh-pa-input,
.dsh-pa-select {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  height: 34px;
  font: inherit;
  color: var(--dsw-alias-label-primary);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dsh-pa-input-row .dsh-pa-input,
.dsh-pa-input-row .dsh-pa-input-invalid {
  flex: 1;
  min-width: 0;
}
.dsh-pa-browse {
  appearance: none;
  font: inherit;
  cursor: pointer;
  flex: none;
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-browse:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-label-dimmed);
}
.dsh-pa-browse:disabled {
  opacity: 0.4;
  cursor: default;
}
.dsh-pa-input:focus-visible,
.dsh-pa-select:focus-visible {
  border-color: var(--dsw-alias-brand-primary);
  outline: none;
}
.dsh-pa-input-invalid {
  border: 1px solid var(--dsw-alias-label-error);
  background: var(--dsw-alias-bg-layer-3);
  height: 34px;
  font: inherit;
  color: var(--dsw-alias-label-primary);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-invalid {
  color: var(--dsw-alias-label-error);
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}
.dsh-pa-hint {
  color: var(--dsw-alias-label-tertiary);
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}
`

/** The `<style>` tag id used for idempotent injection. */
const TAG_ID = 'dsh-photo-album/styles'

/**
 * Inject the album stylesheet once. Safe to call from any apply body; a
 * second call is a no-op for the page lifetime.
 */
export function injectAlbumCss(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(`style[data-plugin-css="${TAG_ID}"]`) !== null) return
  const tag = document.createElement('style')
  tag.dataset.pluginCss = TAG_ID
  tag.textContent = ALBUM_CSS
  document.head.appendChild(tag)
}
