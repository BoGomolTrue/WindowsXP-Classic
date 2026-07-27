export interface DesktopIcon {
  id: string
  label: string
  icon: string
  x: number
  y: number
}

/** Сетка значков рабочего стола XP: шаг 75 px по вертикали, отступ 6 px. */
export const DESKTOP_ICONS: DesktopIcon[] = [
  { id: 'my-documents', label: 'Мои документы', icon: 'icon-documents', x: 6, y: 6 },
  { id: 'my-computer', label: 'Мой компьютер', icon: 'icon-computer', x: 6, y: 81 },
  { id: 'network', label: 'Сетевое окружение', icon: 'icon-network', x: 6, y: 156 },
  { id: 'recycle-bin', label: 'Корзина', icon: 'icon-recycle', x: 6, y: 231 },
  { id: 'ie', label: 'Internet Explorer', icon: 'icon-ie', x: 6, y: 306 },
]

export const USER_NAME = 'Пользователь'
export const COMPUTER_NAME = 'ПОЛЬЗОВАТЕЛЬ-ПК'
