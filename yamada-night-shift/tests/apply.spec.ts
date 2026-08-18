// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context, type Fiber } from '@deepseek-ai/cordis'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { apply } from '../src/client/index.ts'

const read = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8')
const CSS = read('src/client/yamada-night-shift.module.css')
const ART = read('src/client/background-art.generated.ts')
const PACKAGE = JSON.parse(read('package.json'))
const SKIN = JSON.parse(read('skin.json'))

const mounted: Fiber[] = []

async function mount(): Promise<Fiber> {
  const fiber = new Context().plugin({ apply })
  await fiber.await()
  mounted.push(fiber)
  return fiber
}

async function flushMutations(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
}

afterEach(async () => {
  await Promise.all(mounted.splice(0).map(fiber => fiber.dispose()))
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  document.body.removeAttribute('style')
  for (const attribute of [...document.body.attributes]) {
    if (attribute.name.startsWith('data-')) document.body.removeAttribute(attribute.name)
  }
  document.head.innerHTML = ''
  document.title = ''
})

describe('Yamada Night Shift package contract', () => {
  it('declares the public DSH web client manifest', () => {
    expect(PACKAGE.name).toBe('@dsh-external/dsh-client-ui-skin-yamada-night-shift')
    expect(PACKAGE.dsh.client).toEqual({ inject: [], platform: 'web' })
    expect(PACKAGE.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(PACKAGE.peerDependencies['@deepseek-ai/cordis']).toBe('^4.0.1')
  })

  it('publishes a stable skin identity and wiring id', () => {
    expect(SKIN.id).toBe('yamada-night-shift')
    expect(SKIN.bodyAttr).toBe('data-dsh-yamada-night-shift')
    expect(SKIN.package).toBe(PACKAGE.name)
    expect(SKIN.wiring.id).toBe('ui-skin-yamada-night-shift')
  })

  it('ships only local data-URI runtime art', () => {
    expect(ART).toContain('YAMADA_NIGHT_SHIFT_CHARACTER')
    expect(ART).toContain('YAMADA_NIGHT_SHIFT_BACKGROUND')
    expect(ART).toContain('data:image/webp;base64,')
    expect(ART).not.toMatch(/https?:\/\//)
    expect(CSS).not.toMatch(/url\(\s*['"]?https?:\/\//)
  })

  it('encodes the night-only visual contract', () => {
    expect(CSS).toContain('color-scheme: dark')
    expect(CSS).toContain("[data-yamada-character='left']")
    expect(CSS).toMatch(/\[data-yamada-character='left'\]\s*\{[^}]*display: none/s)
    expect(CSS).toContain('height: clamp(570px, 91vh, 1050px)')
    expect(CSS).toContain('height: clamp(370px, 56vh, 690px)')
    expect(CSS).toContain('@media (max-width: 700px)')
    expect(CSS).toContain('@media (prefers-reduced-motion: reduce)')
    expect(CSS).not.toContain('#dce6f5')
  })
})

describe('Yamada Night Shift lifecycle', () => {
  it('sets the scope attribute and removes it on dispose', async () => {
    const fiber = await mount()
    expect(document.body.hasAttribute('data-dsh-yamada-night-shift')).toBe(true)
    await fiber.dispose()
    expect(document.body.hasAttribute('data-dsh-yamada-night-shift')).toBe(false)
  })

  it('leases the scope across overlapping activations', async () => {
    const first = await mount()
    const second = await mount()
    await first.dispose()
    expect(document.body.hasAttribute('data-dsh-yamada-night-shift')).toBe(true)
    await second.dispose()
    expect(document.body.hasAttribute('data-dsh-yamada-night-shift')).toBe(false)
  })

  it('restores a presenter-owned scope value', async () => {
    document.body.setAttribute('data-dsh-yamada-night-shift', 'presenter')
    const fiber = await mount()
    expect(document.body.getAttribute('data-dsh-yamada-night-shift')).toBe('')
    await fiber.dispose()
    expect(document.body.getAttribute('data-dsh-yamada-night-shift')).toBe('presenter')
  })

  it('restores body background properties', async () => {
    document.body.style.backgroundImage = 'linear-gradient(red, blue)'
    document.body.style.backgroundPosition = '12px 24px'
    const fiber = await mount()
    expect(document.body.style.backgroundImage).toContain('data:image/webp;base64,')
    expect(document.body.style.backgroundPosition).toBe('center top')
    await fiber.dispose()
    expect(document.body.style.backgroundImage).toBe('linear-gradient(red, blue)')
    expect(document.body.style.backgroundPosition).toBe('12px 24px')
  })

  it('keeps the same night background across native theme flags', async () => {
    await mount()
    const initial = document.body.style.backgroundImage
    document.body.setAttribute('data-ds-dark-theme', '')
    await flushMutations()
    expect(document.body.style.backgroundImage).toBe(initial)
  })

  it('mounts a single visible character composition and local sidebar avatar', async () => {
    document.body.innerHTML = '<div data-pane="sidebar"><div></div></div>'
    await mount()
    const stage = document.querySelector("[data-skin-chrome='character-stage']")
    const characters = stage?.querySelectorAll<HTMLImageElement>('[data-yamada-character]')
    expect(characters).toHaveLength(2)
    expect(characters?.[0].dataset.yamadaCharacter).toBe('left')
    expect(characters?.[1].dataset.yamadaCharacter).toBe('right')
    expect(characters?.[1].src).toContain('data:image/webp;base64,')
    expect(document.querySelector<HTMLImageElement>("[data-skin-chrome='sidebar-mascot']")?.src)
      .toContain('data:image/webp;base64,')
  })

  it('removes every skin-owned node on dispose', async () => {
    const fiber = await mount()
    expect(document.querySelectorAll("[data-skin-owner='yamada-night-shift']").length)
      .toBeGreaterThan(3)
    await fiber.dispose()
    expect(document.querySelector("[data-skin-owner='yamada-night-shift']")).toBeNull()
  })

  it('does not remove a foreign node reusing the owner marker', async () => {
    const fiber = await mount()
    const foreign = document.createElement('div')
    foreign.dataset.skinOwner = 'yamada-night-shift'
    document.body.append(foreign)
    await fiber.dispose()
    expect(foreign.isConnected).toBe(true)
  })

  it('decorates a sidebar mounted after activation', async () => {
    await mount()
    document.body.insertAdjacentHTML('beforeend', '<div data-pane="sidebar"><div></div></div>')
    await flushMutations()
    expect(document.querySelector("[data-skin-chrome='sidebar-mascot']")).not.toBeNull()
  })

  it('projects active chat and optional panel state', async () => {
    document.body.innerHTML = `
      <main data-phase="active"><div data-chat-flow></div></main>
      <aside data-dsh-better-sidebar></aside>
      <section data-cordis-panel></section>
    `
    await mount()
    expect(document.body.hasAttribute('data-yamada-chat-active')).toBe(true)
    expect(document.body.hasAttribute('data-yamada-conversation-active')).toBe(true)
    expect(document.body.hasAttribute('data-yamada-better-sidebar-open')).toBe(true)
    expect(document.body.hasAttribute('data-yamada-cordis-panel-open')).toBe(true)
  })

  it('updates projected state after React-owned nodes leave', async () => {
    document.body.innerHTML = '<main data-phase="active"><div data-chat-flow></div></main>'
    await mount()
    document.querySelector('main')?.remove()
    await flushMutations()
    expect(document.body.hasAttribute('data-yamada-chat-active')).toBe(false)
    expect(document.body.hasAttribute('data-yamada-conversation-active')).toBe(false)
  })

  it('restores presenter-owned projected attributes', async () => {
    document.body.setAttribute('data-yamada-workspace', 'presenter')
    const fiber = await mount()
    expect(document.body.hasAttribute('data-yamada-workspace')).toBe(false)
    await fiber.dispose()
    expect(document.body.getAttribute('data-yamada-workspace')).toBe('presenter')
  })

  it('sets and restores theme-color', async () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = '#ffffff'
    document.head.append(meta)
    const fiber = await mount()
    expect(meta.content).toBe('#090b10')
    meta.content = '#abcdef'
    await flushMutations()
    expect(meta.content).toBe('#090b10')
    await fiber.dispose()
    expect(meta.content).toBe('#ffffff')
  })

  it('sets and restores title and favicon', async () => {
    document.title = 'Presenter'
    const fiber = await mount()
    expect(document.title).toBe('山田的夜班 · DeepSeek Harness')
    expect(document.querySelector<HTMLLinkElement>("link[data-skin-chrome='favicon']")?.href)
      .toContain('data:image/svg+xml,')
    await fiber.dispose()
    expect(document.title).toBe('Presenter')
    expect(document.querySelector("link[data-skin-chrome='favicon']")).toBeNull()
  })

  it('cleans up after a CSSOM initialization failure', () => {
    let dispose: (() => void) | undefined
    const ctx = {
      effect(factory: () => () => void): void {
        dispose = factory()
      },
    } as unknown as Context
    const insertRule = vi.spyOn(CSSStyleSheet.prototype, 'insertRule')
      .mockImplementationOnce(() => {
        throw new Error('fixture CSSOM failure')
      })

    expect(() => apply(ctx)).toThrow('fixture CSSOM failure')
    dispose?.()
    expect(document.body.hasAttribute('data-dsh-yamada-night-shift')).toBe(false)
    expect(document.querySelector("[data-skin-owner='yamada-night-shift']")).toBeNull()
    insertRule.mockRestore()
  })

  it('marks viewport resize briefly and retracts the marker', async () => {
    vi.useFakeTimers()
    try {
      await mount()
      window.dispatchEvent(new Event('resize'))
      expect(document.body.hasAttribute('data-yamada-viewport-resizing')).toBe(true)
      vi.advanceTimersByTime(121)
      expect(document.body.hasAttribute('data-yamada-viewport-resizing')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})
