import type { DesktopIconKind } from './icons'
import {
  findFreeCell,
  loadDesktopIcons,
  newDesktopId,
  saveDesktopIcons,
  desktopFsPath,
} from './desktop-store'
import type { DesktopIcon } from './icons'

export const DESKTOP_CHANGED = 'xp-desktop-changed'

export function notifyDesktopChanged(): void {
  window.dispatchEvent(new CustomEvent(DESKTOP_CHANGED))
}

export function addUserDesktopIcon(
  label: string,
  kind: DesktopIconKind,
  iconId: string,
  extra?: Pick<DesktopIcon, 'target' | 'fsPath'>,
): void {
  const icons = loadDesktopIcons()
  if (icons.some((item) => item.label.toLowerCase() === label.toLowerCase())) return
  const pos = findFreeCell(icons)
  icons.push({
    id: newDesktopId(),
    label,
    icon: iconId,
    x: pos.x,
    y: pos.y,
    kind,
    fsPath: extra?.fsPath ?? desktopFsPath(label),
    target: extra?.target,
  })
  saveDesktopIcons(icons)
  notifyDesktopChanged()
}

export function removeUserDesktopIconByLabel(label: string): void {
  const icons = loadDesktopIcons().filter((item) => item.system || item.label !== label)
  saveDesktopIcons(icons)
  notifyDesktopChanged()
}

export function renameUserDesktopIcon(oldLabel: string, newLabel: string): void {
  const icons = loadDesktopIcons()
  const item = icons.find((icon) => !icon.system && icon.label === oldLabel)
  if (!item) return
  item.label = newLabel
  if (item.fsPath || !item.system) item.fsPath = desktopFsPath(newLabel)
  saveDesktopIcons(icons)
  notifyDesktopChanged()
}
