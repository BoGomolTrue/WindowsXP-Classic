export type DesktopIconKind = 'system' | 'folder' | 'shortcut' | 'file'

export interface DesktopIcon {
  id: string
  label: string
  icon: string
  x: number
  y: number
  kind: DesktopIconKind
  system?: boolean
  target?: string
  fsPath?: string
}

export const DESKTOP_GRID_STEP = 75
export const DESKTOP_GRID_ORIGIN = 6
export const DESKTOP_ICON_WIDTH = 75
export const DESKTOP_ICON_HEIGHT = 68

export const DESKTOP_ICONS: DesktopIcon[] = [
  { id: 'my-documents', label: 'Мои документы', icon: 'icon-documents', x: 6, y: 6, kind: 'system', system: true },
  { id: 'my-computer', label: 'Мой компьютер', icon: 'icon-computer', x: 6, y: 81, kind: 'system', system: true },
  { id: 'network', label: 'Сетевое окружение', icon: 'icon-network', x: 6, y: 156, kind: 'system', system: true },
  { id: 'ie', label: 'Internet Explorer', icon: 'icon-ie', x: 6, y: 231, kind: 'system', system: true },
  { id: 'telegram', label: 'Telegram', icon: '/Telegram_2019_Logo.svg.webp', x: 6, y: 306, kind: 'system', system: true, target: 'app:telegram' },
  { id: 'recycle-bin', label: 'Корзина', icon: 'icon-recycle', x: 81, y: 306, kind: 'system', system: true },
]

export const USER_NAME = 'Лучший человечек'
export const COMPUTER_NAME = 'ЛУЧШИЙ-ЧЕЛОВЕЧЕК-ПК'
