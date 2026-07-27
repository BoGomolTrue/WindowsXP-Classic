type FsListener = () => void

const listeners = new Set<FsListener>()

export function subscribeFsChange(fn: FsListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function emitFsChange(): void {
  for (const fn of listeners) fn()
}
