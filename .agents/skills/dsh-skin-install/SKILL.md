---
name: dsh-skin-install
description: Install, switch, verify, update, or remove the dsh-yamada-night-shift presentation skin for DSH Web or macOS DSH Desktop.
---

# Install Yamada Night Shift

Use this skill only for the `yamada-night-shift` package in this repository.
Read `skin.json`, `NOTICE`, and the repository README before changing a DSH
installation. Do not infer package ids or profile locations from memory.

## Safety and license

- This is a presentation-only client skin. Do not modify model, service, tool,
  session, or event behavior while installing it.
- Explain that the project uses CC BY-NC-SA 4.0: attribution is required,
  commercial use is prohibited, and adaptations must use the same license.
- The compatibility scaffold is adapted from
  `Small-tailqwq/dsh-deep-whale/maid-atelier`; preserve `NOTICE` and `LICENSE`.

## Discover the target

1. Locate the package directory by finding `skin.json` with id
   `yamada-night-shift`.
2. Read `skin.json` and use its `package` and `wiring.id` values exactly.
3. Determine the requested profile (`web` or `desktop`) and the effective
   `DSH_HOME`. On macOS Desktop, prefer the installed `dsh` command; otherwise
   use the CLI bundled in `/Applications/DSH Desktop.app` as documented in the
   root README.

## Install

Run:

```sh
dsh plugin --profile <web-or-desktop> add <absolute-package-directory>
```

The first registration changes the profile package graph and requires a target
DSH restart. A local installation is a link, so later builds are picked up from
the same package directory.

## Switch

Only one UI skin should be enabled. Set:

```yaml
- id: ui-skin-yamada-night-shift
  disabled: false
```

Set every competing skin id to `disabled: true` in profiles where that skin is
installed. If both a DSH-home patch and a profile patch exist, update the
Yamada row in both because the later layer can override the earlier one. Keep
profile-specific competitor rows out of the global home patch; otherwise other
profiles can report missing-entry warnings. Refresh the client after
configuration HMR settles. Confirm the served boot graph actually changed;
packaged Desktop 2.0.1 may require an application restart when its watcher does
not update that graph.

## Verify

1. Run `dsh --profile <profile> --dump-config` and confirm the Yamada wiring id
   is present and enabled while competing skins are disabled.
2. Confirm the page title includes `山田的夜班`.
3. On the welcome page, confirm the full-body character and night background.
4. In an active conversation, confirm the character moves to the right safe
   area at roughly 50–58vh and does not block the composer or file panel.
5. Disable the skin and refresh. Confirm native title, favicon, theme color,
   DOM, and body attributes are restored with no Yamada nodes left behind.

## Update

Pull or replace the repository files, then run `npm run build` in the package
directory. For a linked install, refresh the client; restart only if package
metadata or plugin registration changed.

## Remove

Run:

```sh
dsh plugin --profile <web-or-desktop> remove @dsh-external/dsh-client-ui-skin-yamada-night-shift
```

Restart the target instance and verify that no Yamada title, favicon, body
attribute, style, character, or owned DOM node remains.
