/**
 * The album settings card: photo source, title, and layout, bound to the
 * 'photo-album' settings namespace the host plugin registers. Rendered as an
 * always-open first-level settings page via the 'settings.section' slot.
 * @module dsh-photo-album/client/AlbumSettingsCard
 */

import type { ReactNode } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the settings-surface SlotMap merge (the 'settings.section' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { CardForm, booleanField, numberField, textField, type CardActions, type CardShell, type FieldState as CardFieldState } from './settings-form.ts'
import type { PhotoAlbumKey } from './locales.ts'

/** The album's settings fields this card edits (the namespace's full schema). */
export interface AlbumSettings {
  /** Master switch for the plugin. */
  enabled?: boolean
  /** Album title. */
  title?: string
  /** Absolute/`~`-relative directory of the user's photos. */
  photosDir?: string
  /** Scan subdirectories. */
  recursive?: boolean
  /** Grid columns per row (1–12). */
  columns?: number
  /** Hidden immediate setting controlled from the gallery. */
  backgroundPhotoId?: string
}

/** What the album settings card renders. */
export interface AlbumSettingsCardState extends CardShell {
  enabled: CardFieldState
  title: CardFieldState
  photosDir: CardFieldState
  recursive: CardFieldState
  columns: CardFieldState
  /** Transient error from the last directory-picker attempt, or null. */
  browseError: string | null
}

/** The registration-side face the card's slot entry injects. */
export interface AlbumSettingsCardFace extends CardActions {
  hooks: {
    /** Card snapshot bound by the renderer as useAlbumSettingsCard. */
    albumSettingsCard: SnapshotStore<AlbumSettingsCardState>
  }
  /** Open the host's native directory picker and stage the picked path. */
  browseDirectory: () => void
}

/** Bridges the 'photo-album' scope onto the card's staged form. */
export class AlbumSettingsCardController {
  private readonly form: CardForm<AlbumSettings>
  private readonly store: SnapshotStore<AlbumSettingsCardState>
  private readonly pickDirectory: () => Promise<string | null>
  private browseError: string | null = null

  constructor(scope: SettingsScope<AlbumSettings>, pickDirectory: () => Promise<string | null>) {
    this.pickDirectory = pickDirectory
    this.form = new CardForm(scope, [
      booleanField('enabled'),
      textField('title'),
      textField('photosDir'),
      booleanField('recursive'),
      numberField('columns', { integer: true, min: 1, max: 12 }),
    ])
    this.store = this.form.bind(() => this.projection())
  }

  private projection(): AlbumSettingsCardState {
    return {
      ...this.form.shell(),
      enabled: this.form.field('enabled'),
      title: this.form.field('title'),
      photosDir: this.form.field('photosDir'),
      recursive: this.form.field('recursive'),
      columns: this.form.field('columns'),
      browseError: this.browseError,
    }
  }

  /** Open the host's native directory picker; a picked path fills the field. */
  private async browse(): Promise<void> {
    this.browseError = null
    this.store.set(this.projection())
    try {
      const path = await this.pickDirectory()
      if (path !== null && path !== '') {
        this.form.actions().edit('photosDir', path)
      }
    } catch (error) {
      this.browseError = error instanceof Error ? error.message : String(error)
    }
    this.store.set(this.projection())
  }

  /** Build the face the card's slot registration injects. */
  inject(): AlbumSettingsCardFace {
    return {
      hooks: { albumSettingsCard: this.store },
      ...this.form.actions(),
      browseDirectory: () => { void this.browse() },
    }
  }

  /** Release the card's scope subscription and bound stores. */
  dispose(): void {
    this.form.dispose()
  }
}

/** Props the renderer binds for the album settings card. */
export type AlbumSettingsCardProps =
  PropsLocale<'photo-album'>
  & InjectFace<AlbumSettingsCardFace>

/** Shared field chrome props. */
interface FieldProps {
  id: string
  label: string
  hint: string
  field: CardFieldState
  disabled: boolean
  /** Localized chrome copy (inherit/on/off/overridden/reset). */
  t: (key: PhotoAlbumKey, params?: Record<string, unknown>) => string
  onEdit: (text: string) => void
  onReset: () => void
}

function FieldHead(props: { id: string; label: string; overridden: boolean; disabled: boolean; t: (key: PhotoAlbumKey, params?: Record<string, unknown>) => string; onReset: () => void }): ReactNode {
  return (
    <div className={'dsh-pa-head'}>
      <label className={'dsh-pa-label'} htmlFor={props.id}>{props.label}</label>
      {props.overridden
        ? (
          <span className={'dsh-pa-badges'}>
            <span className={'dsh-pa-badge'}>{props.t('settings.overridden')}</span>
            <button type="button" className={'dsh-pa-reset'} disabled={props.disabled} onClick={props.onReset}>{props.t('settings.reset')}</button>
          </span>
        )
        : null}
    </div>
  )
}

function TextField(props: FieldProps & { placeholder?: string; action?: { label: string; onClick: () => void }; error?: string | null }): ReactNode {
  return (
    <div className={'dsh-pa-field'}>
      <FieldHead id={props.id} label={props.label} overridden={props.field.overridden} disabled={props.disabled} t={props.t} onReset={props.onReset} />
      <div className={'dsh-pa-input-row'}>
        <input
          id={props.id}
          className={props.field.invalid ? 'dsh-pa-input-invalid' : 'dsh-pa-input'}
          type="text"
          value={props.field.text}
          placeholder={props.placeholder ?? ''}
          disabled={props.disabled}
          onChange={(event) => { props.onEdit(event.target.value) }}
        />
        {props.action
          ? (
            <button type="button" className={'dsh-pa-browse'} disabled={props.disabled} onClick={props.action.onClick}>{props.action.label}</button>
          )
          : null}
      </div>
      {props.error
        ? <p className={'dsh-pa-invalid'}>{props.error}</p>
        : null}
      <p className={'dsh-pa-hint'}>{props.hint}</p>
    </div>
  )
}

function BoolField(props: FieldProps): ReactNode {
  return (
    <div className={'dsh-pa-field'}>
      <FieldHead id={props.id} label={props.label} overridden={props.field.overridden} disabled={props.disabled} t={props.t} onReset={props.onReset} />
      <select
        id={props.id}
        className={'dsh-pa-select'}
        value={props.field.text}
        disabled={props.disabled}
        onChange={(event) => { props.onEdit(event.target.value) }}
      >
        <option value="">{props.t('settings.inherit')}</option>
        <option value="true">{props.t('settings.on')}</option>
        <option value="false">{props.t('settings.off')}</option>
      </select>
      <p className={'dsh-pa-hint'}>{props.hint}</p>
    </div>
  )
}

function NumberField(props: FieldProps): ReactNode {
  return (
    <div className={'dsh-pa-field'}>
      <FieldHead id={props.id} label={props.label} overridden={props.field.overridden} disabled={props.disabled} t={props.t} onReset={props.onReset} />
      <input
        id={props.id}
        className={props.field.invalid ? 'dsh-pa-input-invalid' : 'dsh-pa-input'}
        type="text"
        inputMode="numeric"
        value={props.field.text}
        disabled={props.disabled}
        onChange={(event) => { props.onEdit(event.target.value) }}
      />
      <p className={props.field.invalid ? 'dsh-pa-invalid' : 'dsh-pa-hint'}>{props.field.invalid ? props.t('settings.invalidNumber') : props.hint}</p>
    </div>
  )
}

/**
 * Render the album settings card.
 * @param props - locale copy, the card snapshot, and its form actions.
 */
export function AlbumSettingsCard(props: AlbumSettingsCardProps) {
  const { t } = props
  const state = props.useAlbumSettingsCard(snapshot => snapshot)
  if (!state.available) return null
  const disabled = !state.writable
  const fieldProps = { disabled, t }
  const blocked = !state.dirty || state.invalid || state.saving
  return (
    <li className={'dsh-pa-card'}>
      <div className={'dsh-pa-header-static'}>
        <span className={'dsh-pa-head-text'}>
          <span className={'dsh-pa-name'}>{t('settings.title')}</span>
          <span className={'dsh-pa-description'}>{t('settings.description')}</span>
        </span>
        {state.dirty ? <span className={'dsh-pa-pending'}>{t('settings.unsaved')}</span> : null}
      </div>
      <div className={'dsh-pa-body'}>
        {!state.exposed
          ? <p className={'dsh-pa-read-only'}>{t('settings.notExposed')}</p>
          : null}
        {!state.writable ? <p className={'dsh-pa-read-only'}>{t('settings.readOnly')}</p> : null}
        <BoolField
          id="settings-album-enabled"
          label={t('settings.enabled')}
          hint={t('settings.enabledHint')}
          field={state.enabled}
          onEdit={(text) => { props.edit('enabled', text) }}
          onReset={() => { props.resetField('enabled') }}
          {...fieldProps}
        />
        <TextField
          id="settings-album-title"
          label={t('settings.titleField')}
          hint={t('settings.titleFieldHint')}
          field={state.title}
          onEdit={(text) => { props.edit('title', text) }}
          onReset={() => { props.resetField('title') }}
          {...fieldProps}
        />
        <TextField
          id="settings-album-photosDir"
          label={t('settings.photosDir')}
          hint={t('settings.photosDirHint')}
          field={state.photosDir}
          placeholder="~/Pictures"
          onEdit={(text) => { props.edit('photosDir', text) }}
          onReset={() => { props.resetField('photosDir') }}
          action={{ label: t('settings.browse'), onClick: () => { props.browseDirectory() } }}
          error={state.browseError !== null ? t('settings.browseError', { error: state.browseError }) : null}
          {...fieldProps}
        />
        <BoolField
          id="settings-album-recursive"
          label={t('settings.recursive')}
          hint={t('settings.recursiveHint')}
          field={state.recursive}
          onEdit={(text) => { props.edit('recursive', text) }}
          onReset={() => { props.resetField('recursive') }}
          {...fieldProps}
        />
        <NumberField
          id="settings-album-columns"
          label={t('settings.columns')}
          hint={t('settings.columnsHint')}
          field={state.columns}
          onEdit={(text) => { props.edit('columns', text) }}
          onReset={() => { props.resetField('columns') }}
          {...fieldProps}
        />
        <div className={'dsh-pa-footer'}>
          {state.failed ? <p className={'dsh-pa-failed'}>{t('settings.saveFailed')}</p> : null}
          <button type="button" className={'dsh-pa-discard'} disabled={!state.dirty || state.saving} onClick={props.discard}>{t('settings.discard')}</button>
          <button type="button" className={'dsh-pa-save'} disabled={blocked} onClick={props.save}>{t(!state.saving ? 'settings.save' : 'settings.saving')}</button>
        </div>
      </div>
    </li>
  )
}

/** Props the settings section binds for the album card page. */
export type AlbumSettingsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'photo-album'>
  & InjectFace<AlbumSettingsCardFace>

/** Render the album settings card as a first-level settings page. */
export function AlbumSettingsSection(props: AlbumSettingsSectionProps): ReactNode {
  const { t, useAlbumSettingsCard, save, discard, edit, resetField, browseDirectory } = props
  return (
    <ul className={'dsh-pa-section-list'}>
      <AlbumSettingsCard
        t={t}
        useAlbumSettingsCard={useAlbumSettingsCard}
        save={save}
        discard={discard}
        edit={edit}
        resetField={resetField}
        browseDirectory={browseDirectory}
      />
    </ul>
  )
}
