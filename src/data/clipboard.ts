let clipboard: { sourcePath: string; names: string[]; cut: boolean } | null = null

export function copyItems(sourcePath: string, names: string[]): void {
  if (!names.length) return
  clipboard = { sourcePath, names: [...names], cut: false }
}

export function cutItems(sourcePath: string, names: string[]): void {
  if (!names.length) return
  clipboard = { sourcePath, names: [...names], cut: true }
}

export function canPaste(): boolean {
  return clipboard !== null && clipboard.names.length > 0
}

export function getClipboardSourcePath(): string | null {
  return clipboard?.sourcePath ?? null
}

export function clearClipboard(): void {
  clipboard = null
}

export function consumePaste(_targetPath: string, pasteFn: (from: string, names: string[], cut: boolean) => boolean): boolean {
  if (!clipboard) return false
  const ok = pasteFn(clipboard.sourcePath, clipboard.names, clipboard.cut)
  if (ok && clipboard.cut) clearClipboard()
  return ok
}
