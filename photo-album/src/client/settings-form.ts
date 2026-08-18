/**
 * Staged form model behind the album settings card. A card stages what the
 * user types and writes it only on save; the settings write is a durable,
 * revision-fenced document mutation, so staging keeps what is on screen
 * exactly what a save would store.
 * @module dsh-photo-album/client/settings-form
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

/** The write one field's staged text performs when the card is saved. */
export type FieldWrite = { kind: 'set'; value: unknown } | { kind: 'clear' }

/** How one field converts between its stored value and its draft text. */
export interface FieldSpec {
  /** Field name inside the namespace section. */
  field: string
  /** Render a stored value as draft text ('' when the section carries none). */
  format: (value: unknown) => string
  /** The write this draft stages, or undefined when the text is not accepted. */
  parse: (text: string) => FieldWrite | undefined
}

/** One field as the card renders it. */
export interface FieldState {
  /** Draft text the control renders. */
  text: string
  /** Whether saving would leave a user-layer entry for this field. */
  overridden: boolean
  /** Whether the draft is not a value this field accepts (blocks saving). */
  invalid: boolean
}

/** Form state the settings card reads. */
export interface CardShell {
  /** False while the namespace is still loading. */
  available: boolean
  /** Whether the namespace is actually served to this client. */
  exposed: boolean
  /** Whether the Host document accepts writes. */
  writable: boolean
  /** Whether the form holds edits a save would write. */
  dirty: boolean
  /** Whether any staged draft is invalid (blocks saving). */
  invalid: boolean
  /** Whether a save is crossing the wire. */
  saving: boolean
  /** Whether the last save did not land as staged. */
  failed: boolean
}

/** The write actions the card's slot entry injects. */
export interface CardActions {
  edit: (field: string, text: string) => void
  resetField: (field: string) => void
  save: () => void
  discard: () => void
}

/** Whole- or decimal-number constraints. */
export interface NumberConstraints {
  integer?: boolean
  min?: number
  max?: number
}

/** A free-text field; an empty draft clears the field. */
export function textField(field: string): FieldSpec {
  return {
    field,
    format: value => typeof value === 'string' ? value : '',
    parse: (text) => {
      const trimmed = text.trim()
      return trimmed === '' ? { kind: 'clear' } : { kind: 'set', value: trimmed }
    },
  }
}

/** A whole- or decimal-number field. */
export function numberField(field: string, constraints: NumberConstraints = {}): FieldSpec {
  const { integer = false, min, max } = constraints
  return {
    field,
    format: value => typeof value === 'number' ? String(value) : '',
    parse: (text) => {
      const trimmed = text.trim()
      if (trimmed === '') return { kind: 'clear' }
      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed)) return undefined
      if (integer && !Number.isInteger(parsed)) return undefined
      if (min !== undefined && parsed < min) return undefined
      if (max !== undefined && parsed > max) return undefined
      return { kind: 'set', value: parsed }
    },
  }
}

/** A boolean field, edited through 'true'/'false' draft text. */
export function booleanField(field: string): FieldSpec {
  return {
    field,
    format: value => typeof value === 'boolean' ? String(value) : '',
    parse: (text) => {
      const trimmed = text.trim()
      if (trimmed === '') return { kind: 'clear' }
      if (trimmed === 'true') return { kind: 'set', value: true }
      if (trimmed === 'false') return { kind: 'set', value: false }
      return undefined
    },
  }
}

/** One staged edit. */
interface StagedEdit {
  text: string
  clear: boolean
}

/**
 * Stages one card's edits over one settings namespace and writes them on save.
 * The Host is the only authority on whether a value was accepted, so a field
 * lands only when the read-back holds the staged value; a failed field keeps
 * its draft for correction.
 */
export class CardForm<T> {
  private readonly specs = new Map<string, FieldSpec>()
  private readonly staged = new Map<string, StagedEdit>()
  private readonly listeners = new Set<() => void>()
  private readonly disposeScope: () => void
  private disposed = false
  private saving = false
  private failed = false

  constructor(
    private readonly scope: SettingsScope<T>,
    specs: FieldSpec[],
  ) {
    for (const spec of specs) this.specs.set(spec.field, spec)
    this.disposeScope = scope.subscribe(() => { this.publish() })
  }

  /** Release the scope subscription and bound store listeners. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.disposeScope()
    this.listeners.clear()
  }

  /** Bind a projection of this form into a snapshot store. */
  bind<S>(project: () => S): SnapshotStore<S> {
    const store = createSnapshotStore(project())
    this.listeners.add(() => { store.set(project()) })
    return store
  }

  /** Card-level state. */
  shell(): CardShell {
    const snapshot = this.scope.getSnapshot()
    return {
      available: snapshot.status !== 'loading',
      exposed: snapshot.status === 'ready',
      writable: snapshot.writable,
      dirty: this.staged.size > 0,
      invalid: this.plan().some(item => item === undefined),
      saving: this.saving,
      failed: this.failed,
    }
  }

  /** One field's state from the effective section and its staged draft. */
  field(field: string): FieldState {
    const spec = this.specOf(field)
    const staged = this.staged.get(field)
    if (staged === undefined) {
      return { text: spec.format(this.sectionValue(field)), overridden: this.stored(field), invalid: false }
    }
    const write = staged.clear ? { kind: 'clear' as const } : spec.parse(staged.text)
    return { text: staged.text, overridden: write?.kind === 'set', invalid: write === undefined }
  }

  /** The actions the card's slot registration injects. */
  actions(): CardActions {
    return {
      edit: (field, text) => { this.stage(field, { text, clear: false }) },
      resetField: (field) => {
        this.stage(field, { text: this.specOf(field).format(this.baseValue(field)), clear: true })
      },
      save: () => { void this.save() },
      discard: () => {
        if (this.staged.size === 0 && !this.failed) return
        this.staged.clear()
        this.failed = false
        this.publish()
      },
    }
  }

  private async save(): Promise<void> {
    if (this.staged.size === 0 || this.saving) return
    const plan = this.plan()
    if (plan.some(item => item === undefined)) return
    const fields = new Set(this.staged.keys())
    this.saving = true
    this.failed = false
    this.publish()
    const landed = new Set<string>()
    for (const [field, write] of plan as Array<[string, FieldWrite]>) {
      if (write.kind === 'clear') {
        await this.scope.unset(field)
        if (!this.stored(field)) landed.add(field)
      } else {
        await this.scope.set(field, write.value)
        if (this.userLayer()?.[field] === write.value) landed.add(field)
      }
    }
    for (const field of fields) {
      if (landed.has(field)) this.staged.delete(field)
    }
    this.saving = false
    this.failed = landed.size !== fields.size
    this.publish()
  }

  /** Every staged edit a save would write; undefined entries block the save. */
  private plan(): Array<[string, FieldWrite] | undefined> {
    const plan: Array<[string, FieldWrite] | undefined> = []
    for (const [field, staged] of this.staged) {
      const spec = this.specOf(field)
      if (staged.clear) {
        if (this.stored(field)) plan.push([field, { kind: 'clear' }])
        continue
      }
      if (staged.text === spec.format(this.sectionValue(field))) continue
      const write = spec.parse(staged.text)
      plan.push(write === undefined ? undefined : [field, write])
    }
    return plan
  }

  private stage(field: string, edit: StagedEdit): void {
    this.staged.set(field, edit)
    this.failed = false
    this.publish()
  }

  private specOf(field: string): FieldSpec {
    const spec = this.specs.get(field)
    if (spec === undefined) throw new Error(`settings card has no field ${field}`)
    return spec
  }

  private snapshot(): SettingsScopeSnapshot<T> {
    return this.scope.getSnapshot()
  }

  private sectionValue(field: string): unknown {
    return (this.snapshot().value as Record<string, unknown> | undefined)?.[field]
  }

  private baseValue(field: string): unknown {
    return (this.snapshot().base as Record<string, unknown> | undefined)?.[field]
  }

  private userLayer(): Record<string, unknown> | undefined {
    return this.snapshot().user as Record<string, unknown> | undefined
  }

  private stored(field: string): boolean {
    const user = this.userLayer()
    return user !== undefined && Object.hasOwn(user, field)
  }

  private publish(): void {
    for (const listener of this.listeners) listener()
  }
}
