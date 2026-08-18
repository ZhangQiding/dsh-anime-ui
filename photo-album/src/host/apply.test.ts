import { describe, expect, it } from 'vitest'
import { apply } from '../index.ts'

/** A minimal cordis context: enough for apply() to register settings, routes, and the announcement. */
function mockCtx(registrations: string[]) {
  const ctx: any = {
    effect: (callback: () => unknown) => callback(),
    inject: (_services: string[], callback: (scope: unknown) => void) => { callback(ctx) },
    webServer: {
      register: (route: { path: string }) => {
        registrations.push(`route:${route.path}`)
        return () => {}
      },
    },
    systemPrompt: {
      section: (section: { name: string }) => {
        registrations.push(`prompt:${section.name}`)
        return () => {}
      },
    },
    settings: {
      register: (namespace: string, _schema: unknown, options: { base: Record<string, unknown> }) => {
        registrations.push(`settings:${namespace}`)
        return {
          get: () => options.base,
          watch: () => () => {},
        }
      },
    },
    logger: { warn: () => {}, error: () => {} },
  }
  return ctx
}

describe('host apply', () => {
  it('registers the album routes and the announcement without throwing', () => {
    const registrations: string[] = []
    const ctx = mockCtx(registrations)
    expect(() => apply(ctx as never)).not.toThrow()
    expect(registrations).toContain('settings:photo-album')
    expect(registrations).toContain('route:/api/photo-album')
    expect(registrations).toContain('prompt:plugin:photo-album')
  })
})
