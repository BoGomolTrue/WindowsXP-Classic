import {
  DESKTOP_GRID_ORIGIN,
  DESKTOP_GRID_STEP,
  DESKTOP_ICON_HEIGHT,
  DESKTOP_ICON_WIDTH,
  DESKTOP_ICONS,
  type DesktopIcon,
} from './icons'
import {
  FILE_SYSTEM,
  PATH_DESKTOP,
  joinPath,
  type FSNode,
} from './filesystem'
import { clampToWorkArea, formatDateTime } from '../utils/helpers'

const STORAGE_KEY = 'xp-desktop-icons-v1'
const TASKBAR_H = 28

export function loadDesktopIcons(): DesktopIcon[] {
  const defaults = DESKTOP_ICONS.map((icon) => ({ ...icon }))
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const saved = JSON.parse(raw) as {
      positions?: Record<string, { x: number; y: number }>
      user?: DesktopIcon[]
    }
    if (saved.positions) {
      for (const icon of defaults) {
        const pos = saved.positions[icon.id]
        if (pos) {
          icon.x = pos.x
          icon.y = pos.y
        }
      }
    }
    const user = (saved.user ?? []).map((icon) => {
      const copy = { ...icon }
      if (!copy.system && !copy.fsPath && copy.kind !== 'shortcut') {
        copy.fsPath = desktopFsPath(copy.label)
      }
      return copy
    })
    return [...defaults, ...user]
  } catch {
    return defaults
  }
}

export function saveDesktopIcons(icons: DesktopIcon[]): void {
  const positions: Record<string, { x: number; y: number }> = {}
  const user: DesktopIcon[] = []
  for (const icon of icons) {
    positions[icon.id] = { x: icon.x, y: icon.y }
    if (!icon.system) user.push({ ...icon })
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ positions, user }))
}

export function snapIconPosition(x: number, y: number): { x: number; y: number } {
  const snappedX = DESKTOP_GRID_ORIGIN + Math.round((x - DESKTOP_GRID_ORIGIN) / DESKTOP_GRID_STEP) * DESKTOP_GRID_STEP
  const snappedY = DESKTOP_GRID_ORIGIN + Math.round((y - DESKTOP_GRID_ORIGIN) / DESKTOP_GRID_STEP) * DESKTOP_GRID_STEP
  return clampToWorkArea(snappedX, snappedY, DESKTOP_ICON_WIDTH, DESKTOP_ICON_HEIGHT, TASKBAR_H)
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

export function findFreeCell(icons: DesktopIcon[], skipId?: string): { x: number; y: number } {
  const occupied = new Set(
    icons.filter((icon) => icon.id !== skipId).map((icon) => cellKey(icon.x, icon.y)),
  )
  const maxRows = Math.max(
    1,
    Math.floor((window.innerHeight - TASKBAR_H - DESKTOP_GRID_ORIGIN) / DESKTOP_GRID_STEP),
  )
  const maxCols = Math.max(
    1,
    Math.floor((window.innerWidth - DESKTOP_GRID_ORIGIN) / DESKTOP_GRID_STEP),
  )
  for (let col = 0; col < maxCols; col += 1) {
    for (let row = 0; row < maxRows; row += 1) {
      const x = DESKTOP_GRID_ORIGIN + col * DESKTOP_GRID_STEP
      const y = DESKTOP_GRID_ORIGIN + row * DESKTOP_GRID_STEP
      if (!occupied.has(cellKey(x, y))) return { x, y }
    }
  }
  return snapIconPosition(DESKTOP_GRID_ORIGIN, DESKTOP_GRID_ORIGIN)
}

export function uniqueDesktopName(icons: DesktopIcon[], base: string, ext = ''): string {
  const names = new Set(icons.map((icon) => icon.label.toLowerCase()))
  let candidate = base + ext
  if (!names.has(candidate.toLowerCase())) return candidate
  for (let i = 2; i < 100; i += 1) {
    candidate = `${base} (${i})${ext}`
    if (!names.has(candidate.toLowerCase())) return candidate
  }
  return `${base} (${Date.now()})${ext}`
}

export function newDesktopId(): string {
  return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function alignIconsToGrid(icons: DesktopIcon[]): void {
  for (const icon of icons) {
    const pos = snapIconPosition(icon.x, icon.y)
    icon.x = pos.x
    icon.y = pos.y
  }
  resolveCollisions(icons)
}

export function resolveCollisions(icons: DesktopIcon[]): void {
  const byCell = new Map<string, DesktopIcon>()
  for (const icon of icons) {
    const pos = snapIconPosition(icon.x, icon.y)
    icon.x = pos.x
    icon.y = pos.y
    const key = cellKey(icon.x, icon.y)
    const other = byCell.get(key)
    if (other) {
      const free = findFreeCell(icons, icon.id)
      icon.x = free.x
      icon.y = free.y
      byCell.set(cellKey(icon.x, icon.y), icon)
    } else {
      byCell.set(key, icon)
    }
  }
}

export function addDesktopFolderNode(name: string): FSNode {
  const node: FSNode = {
    name,
    type: 'folder',
    icon: 'icon-folder',
    modified: formatDateTime(new Date()),
    children: [],
  }
  FILE_SYSTEM.children!.push(node)
  return node
}

export function addDesktopShortcutNode(name: string, target: string, targetIcon: string): FSNode {
  const node: FSNode = {
    name,
    type: 'file',
    icon: targetIcon,
    kind: 'Ярлык',
    modified: formatDateTime(new Date()),
    shortcutTarget: target,
  }
  FILE_SYSTEM.children!.push(node)
  return node
}

export function removeDesktopNode(name: string): void {
  const children = FILE_SYSTEM.children
  if (!children) return
  const index = children.findIndex((node) => node.name === name)
  if (index >= 0) children.splice(index, 1)
}

export function renameDesktopNode(oldName: string, newName: string): void {
  const node = FILE_SYSTEM.children?.find((child) => child.name === oldName)
  if (node) node.name = newName
}

export function desktopFsPath(name: string): string {
  return joinPath([PATH_DESKTOP, name])
}

export function shortcutIconForTarget(target: string): string {
  if (target === 'app:ie') return 'icon-ie'
  if (target === 'app:explorer') return 'icon-folder-open'
  if (target.startsWith('path:')) {
    const path = target.slice(5)
    if (path.includes('Мои документы')) return 'icon-documents'
    if (path.includes('Мой компьютер')) return 'icon-computer'
    if (path.includes('Сетевое окружение')) return 'icon-network'
  }
  return 'icon-file-exe'
}
