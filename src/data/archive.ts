export const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar'])

export function isArchiveFile(name: string): boolean {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return false
  return ARCHIVE_EXTENSIONS.has(name.slice(dot + 1).toLowerCase())
}

export function archiveBaseName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(0, dot) : name
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`
}
