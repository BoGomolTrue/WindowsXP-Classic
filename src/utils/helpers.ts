import sprite from '../assets/icons.svg?raw'

/** Встраивает набор значков в документ — нужен для ссылок <use> и SVG-фильтров. */
export function installSprite(): void {
  if (document.getElementById('xp-sprite')) return
  const holder = document.createElement('div')
  holder.id = 'xp-sprite'
  holder.setAttribute('aria-hidden', 'true')
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
  holder.innerHTML = sprite
  document.body.insertBefore(holder, document.body.firstChild)
}

const SVG_TO_PNG: Record<string, string> = {
  'icon-documents': 'MyDocuments.png',
  'icon-pictures': 'MyPictures.png',
  'icon-music': 'MyMusic.png',
  'icon-computer': 'MyComputer.png',
  'icon-drive': 'LocalDisk.png',
  'icon-cdrom': 'RemovableMedia.png',
  'icon-controlpanel': 'ControlPanel.png',
  'icon-network': 'MyNetworkPlaces.png',
  'icon-file-jpg': 'JPG.png',
  'icon-file-text': 'TXT.png',
  'icon-mediaplayer': 'MPC.png',
  'icon-notepad': 'Notepad.png',
  'icon-folder': 'FolderClosed.png',
  'icon-folder-open': 'FolderOpened.png',
  'icon-ie': 'InternetExplorer6.png',
  'icon-outlook': 'OutlookExpress.png',
  'icon-messenger': 'WindowsMessenger.png',
  'icon-file-doc': 'DOC.png',
  'icon-file-xls': 'GenericDocument.png',
  'icon-file-exe': 'Default.png',
  'icon-file': 'GenericDocument.png',
  'icon-catalog': 'AddressBook.png',
  'icon-recycle': 'RecycleBinempty.png',
  'icon-printer': 'Printer.png',
  'icon-programs': 'Programs.png',
  'icon-find': 'Search.png',
  'icon-help': 'HelpandSupport.png',
  'icon-run': 'Run.png',
  'icon-settings': 'Properties.png',
  'icon-showdesktop': 'Desktop.png',
  'icon-winupdate': 'WindowsUpdate.png',
  'icon-tray-volume': 'Volume.png',
  'icon-tray-network': 'NetworkConnections.png',
  'icon-tray-shield': 'SecurityCenter.png',
  'icon-xp-logo': 'WindowsUpdate.png',
  'icon-start-flag': 'Power.png',
  'tb-back': 'Back.png',
  'tb-forward': 'Forward.png',
  'tb-up': 'Up.png',
  'tb-search': 'Search.png',
  'tb-folders': 'FolderClosed.png',
  'tb-views': 'FolderView.png',
  'tb-go': 'Go.png',
  'tb-stop': 'Stop.png',
  'tb-refresh': 'Explorer.png',
  'tb-home': 'Desktop.png',
}

export function icon(id: string, size = 32, cls = ''): string {
  if (id.startsWith('/') || /\.(webp|jpg|jpeg|gif|svg)$/i.test(id)) {
    const src = id.startsWith('/') ? id : `/images/xp/icons/${id}`
    return `<img class="${cls}" src="${src}" width="${size}" height="${size}" alt="" draggable="false">`
  }
  if (id.endsWith('.png')) {
    return `<img class="${cls}" src="/images/xp/icons/${id}" width="${size}" height="${size}" alt="" draggable="false">`
  }
  const png = SVG_TO_PNG[id]
  if (png) {
    return `<img class="${cls}" src="/images/xp/icons/${png}" width="${size}" height="${size}" alt="" draggable="false">`
  }
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><use href="#${id}"/></svg>`
}

/** Часы панели задач: краткий формат времени русской локали XP. */
export function formatClock(date: Date): string {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatDateTime(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${d}.${m}.${date.getFullYear()} ${h}:${min}`
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function escapeAttr(s: string): string {
  return escapeHtml(s)
}

/** «&Файл» → «<u>Ф</u>айл»: подчёркивание клавиши быстрого доступа. */
export function accel(label: string): string {
  const i = label.indexOf('&')
  if (i < 0 || i === label.length - 1) return escapeHtml(label)
  return escapeHtml(label.slice(0, i)) + '<u>' + escapeHtml(label[i + 1]) + '</u>' + escapeHtml(label.slice(i + 2))
}

export function stripAccel(label: string): string {
  return label.replace('&', '')
}

/** Удерживает точку в пределах рабочей области (без панели задач). */
export function clampToWorkArea(x: number, y: number, w: number, h: number, taskbar = 28): { x: number; y: number } {
  return {
    x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - w)),
    y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - taskbar - h)),
  }
}
