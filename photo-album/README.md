# dsh-photo-album — a photo-album UI plugin for the DSH web GUI

中文 | [English](README.md)

A hot-pluggable DeepSeek Harness (DSH) Web/Desktop companion: it adds an **Album** entry with a local photo grid, lightbox, and **Use as background** action. The opaque selection is persisted in plugin-owned DSH Home state and immediately drives the Yamada skin shipped in the same repository.

- No DSH source changes: a cordis plugin (host half + browser half) mounted via DOM extension, the same shape as the task-board / pet plugins in the `dsh-web-ui` family.
- Uninstalls cleanly; independent of other plugins.
- Configurable from the DSH settings page (**Settings → Album**): photos directory, title, columns, recursion.

## Features

- **Sidebar entry**: injected under the New Session button (icon+label when wide, icon-only in the collapsed rail, theme-aware via `--dsw-*` tokens).
- **Photo grid**: newest-first, `columns` per row, lazy-loaded images with filename on hover.
- **Lightbox**: click a photo to open; prev/next buttons or arrow keys, `Esc` or `×` to close; shows `current / total`.
- **Persistent background**: grid cards and the lightbox expose **Use as background**; the header exposes **Restore default background**. Directory/background choices live in `DSH_HOME/storages/dsh-photo-album.json`, never port-scoped browser storage.
- **Two photo sources**:
  - `photosDir` configured → recursively scan it (jpg/png/gif/webp/svg/avif/bmp).
  - unset or unreadable → built-in samples, with a warning hint when the directory is missing/not a directory.
- **Settings page**: a first-level `Settings → Album` page with a staged form (save to persist). Fields: enabled / title / photos directory / recursive / columns.
- **System-prompt announcement**: the host half registers a `plugin:photo-album` system-prompt section so every agent knows the album exists and how to cooperate with it.

## Install

From the repository root, run the line for each profile you use:

```sh
dsh plugin --profile web add "$PWD/photo-album"
dsh plugin --profile desktop add "$PWD/photo-album"
```

Restart `dsh web` after first registration. Quit and reopen packaged macOS DSH Desktop 2.0.1. Install `yamada-night-shift/` as well to apply selected photos to that skin.

## Point it at your photos

1. Open **Settings → Album**.
2. Set **Photos directory** to your folder's absolute path (`~/` prefix allowed, e.g. `~/Pictures`).
3. Enable **Scan subdirectories** if you want nested folders, and tune **Columns**.
4. Save, then reopen the album entry — it rescans on every open.
5. Choose **Use as background** from a card or the lightbox; use **Restore default background** to return to the bundled night scene.

With no directory configured, the plugin shows six built-in samples under `assets/samples/`.

## Build

Requires Node ≥ 22.19; all types and runtime APIs come from the official NPM SDK (`@deepseek-ai/*` devDependencies) — no DSH source checkout needed.

```sh
pnpm install
pnpm run typecheck
pnpm run test
pnpm run build   # tsdown → lib/index.js (host) + lib/client.js (browser); tsc → lib/types/*.d.ts
```

## Privacy and safety

- `/api/photo-album/*` is loopback-only, and user ids pass a path-traversal fence.
- Photo bytes are never copied into this repository, uploaded, or stored in the browser. Only an opaque `sample/...` or `user/...` id is persisted.
- The native directory picker and immediate background actions write the plugin-owned state file atomically; ordinary title/column/recursion fields continue to use the DSH settings surface where available.
- Deleted photos, changed directories, unavailable routes, and malformed responses make the Yamada skin fall back to its bundled night scene.

## License

MIT; see this directory's `LICENSE`. The Yamada skin and visual materials use CC BY-NC-SA 4.0 as documented at repository root.
