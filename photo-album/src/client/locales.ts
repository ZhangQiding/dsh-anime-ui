/**
 * dsh-photo-album locale dictionaries (zh/en).
 * @module dsh-photo-album/client/locales
 */

/** Dictionary namespace this package registers. */
export const NS = 'photo-album'

/** Chinese copy. */
export const zh = {
  'entry.label': '相册',
  'gallery.loading': '正在读取照片…',
  'gallery.empty': '这里还没有照片。',
  'gallery.samplesHint': '当前展示内置示例照片；点下方按钮选择你的照片文件夹，或到「设置 → 相册」里配置。',
  'gallery.chooseDirectory': '选择照片目录…',
  'gallery.chooseError': '选择目录失败：{error}',
  'gallery.directoryHint': '照片来自目录：{dir}',
  'gallery.warning': '提示：{warning}',
  'gallery.count': '{n} 张',
  'gallery.setBackground': '设为背景',
  'gallery.backgroundActive': '当前背景',
  'gallery.applyingBackground': '应用中…',
  'gallery.resetBackground': '恢复默认背景',
  'gallery.backgroundError': '无法更新背景：{error}',
  'lightbox.close': '关闭',
  'lightbox.prev': '上一张',
  'lightbox.next': '下一张',
  'lightbox.counter': '{current} / {total}',
  'settings.title': '相册',
  'settings.description': '配置照片来源与相册显示。',
  'settings.enabled': '启用相册',
  'settings.enabledHint': '关闭后隐藏侧边栏入口并停用相册路由。',
  'settings.titleField': '相册标题',
  'settings.titleFieldHint': '显示在相册顶部的标题，留空使用默认「生活相册」。',
  'settings.photosDir': '照片目录',
  'settings.photosDirHint': '本地照片文件夹的绝对路径（支持 ~/ 开头）；留空则展示内置示例照片。',
  'settings.browse': '浏览…',
  'settings.browseError': '无法打开目录选择器：{error}',
  'settings.recursive': '递归子目录',
  'settings.recursiveHint': '是否扫描子文件夹里的照片。',
  'settings.columns': '每行列数',
  'settings.columnsHint': '相册网格每行显示的照片列数（1–12）。',
  'settings.inherit': '继承',
  'settings.on': '开',
  'settings.off': '关',
  'settings.overridden': '已覆盖',
  'settings.reset': '恢复默认',
  'settings.notExposed': '当前 DSH 版本未向设置页暴露本插件的配置命名空间，表单不可用。可在 ~/.dsh/settings.yaml 里配置 photo-album 段。',
  'settings.readOnly': '当前部署的设置只读。',
  'settings.save': '保存',
  'settings.saving': '保存中…',
  'settings.discard': '放弃',
  'settings.unsaved': '未保存',
  'settings.saveFailed': '部署未接受这些值，已保留供你修改。',
  'settings.invalidNumber': '请输入 1–12 的整数，留空则使用默认值。',
} as const

/** English copy. */
export const en = {
  'entry.label': 'Album',
  'gallery.loading': 'Loading photos…',
  'gallery.empty': 'No photos here yet.',
  'gallery.samplesHint': 'Showing built-in sample photos; click the button below to choose your photos folder, or configure it in Settings → Album.',
  'gallery.chooseDirectory': 'Choose photos directory…',
  'gallery.chooseError': 'Could not choose a directory: {error}',
  'gallery.directoryHint': 'Photos from: {dir}',
  'gallery.warning': 'Note: {warning}',
  'gallery.count': '{n} photos',
  'gallery.setBackground': 'Use as background',
  'gallery.backgroundActive': 'Current background',
  'gallery.applyingBackground': 'Applying…',
  'gallery.resetBackground': 'Restore default background',
  'gallery.backgroundError': 'Could not update the background: {error}',
  'lightbox.close': 'Close',
  'lightbox.prev': 'Previous',
  'lightbox.next': 'Next',
  'lightbox.counter': '{current} / {total}',
  'settings.title': 'Album',
  'settings.description': 'Configure the photo source and album display.',
  'settings.enabled': 'Enable the album',
  'settings.enabledHint': 'When off, the sidebar entry hides and the album routes stop.',
  'settings.titleField': 'Album title',
  'settings.titleFieldHint': 'Title shown above the album; blank falls back to the default.',
  'settings.photosDir': 'Photos directory',
  'settings.photosDirHint': 'Absolute path to your photos folder (~/ prefix allowed); blank shows the built-in samples.',
  'settings.browse': 'Browse…',
  'settings.browseError': 'Could not open the directory picker: {error}',
  'settings.recursive': 'Scan subdirectories',
  'settings.recursiveHint': 'Whether to include photos inside subfolders.',
  'settings.columns': 'Columns',
  'settings.columnsHint': 'Grid columns per row (1\u201312).',
  'settings.inherit': 'Inherit',
  'settings.on': 'On',
  'settings.off': 'Off',
  'settings.overridden': 'Overridden',
  'settings.reset': 'Reset to default',
  'settings.notExposed': 'This DSH version does not expose the plugin\'s settings namespace to the configuration page. Configure the photo-album section in ~/.dsh/settings.yaml instead.',
  'settings.readOnly': 'This deployment stores settings read-only.',
  'settings.save': 'Save',
  'settings.saving': 'Saving\u2026',
  'settings.discard': 'Discard',
  'settings.unsaved': 'Unsaved',
  'settings.saveFailed': 'The deployment did not accept these values; they were left for you to correct.',
  'settings.invalidNumber': 'Enter a whole number 1\u201312, or leave blank for the default.',
} as const

/** Key union for this namespace. */
export type PhotoAlbumKey = keyof typeof zh

/**
 * Active dictionary, picked by the document language at call time. The
 * sidebar entry and gallery are DOM-injected surfaces with no framework locale
 * seat, so they resolve copy the same way as the task-board's injected surface.
 */
export function dictionary(): Record<PhotoAlbumKey, string> {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : 'zh'
  return lang.toLowerCase().startsWith('en') ? en : zh
}

/** Translate a key with optional `{name}` template params. */
export function t(key: string, params?: Record<string, unknown>): string {
  let text: string = (dictionary() as Record<string, string>)[key] ?? key
  if (params !== undefined) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-photo-album UI copy. */
    'photo-album': PhotoAlbumKey
  }
}
