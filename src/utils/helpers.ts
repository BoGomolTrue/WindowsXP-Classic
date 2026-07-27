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

export function icon(id: string, size = 32, cls = ''): string {
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
