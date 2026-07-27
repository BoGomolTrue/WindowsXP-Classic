import { accel, icon } from '../utils/helpers'

export interface MenuItem {
  label?: string
  /** Идентификатор символа из набора значков. */
  icon?: string
  /** Текст сочетания клавиш справа. */
  shortcut?: string
  separator?: boolean
  disabled?: boolean
  checked?: boolean
  /** Пункт по умолчанию — рисуется полужирным. */
  bold?: boolean
  items?: MenuItem[]
  action?: () => void
}

interface OpenMenu {
  el: HTMLElement
  items: MenuItem[]
  parentItemEl?: HTMLElement
}

const stack: OpenMenu[] = []
let dismissBound = false

const TASKBAR_H = 28

export function closeAllMenus(): void {
  while (stack.length) closeTop()
}

function closeTop(): void {
  const top = stack.pop()
  if (!top) return
  top.el.remove()
  top.parentItemEl?.classList.remove('hot')
}

function closeDownTo(depth: number): void {
  while (stack.length > depth) closeTop()
}

function bindDismiss(): void {
  if (dismissBound) return
  dismissBound = true
  document.addEventListener('mousedown', (e) => {
    if (!stack.length) return
    const inside = stack.some((m) => m.el.contains(e.target as Node))
    if (!inside) closeAllMenus()
  }, true)
  document.addEventListener('keydown', (e) => {
    if (!stack.length) return
    if (e.key === 'Escape') {
      e.stopPropagation()
      closeTop()
    }
  })
}

export interface MenuPlacement {
  x: number
  y: number
  /** Правый край меню совмещается с x. */
  alignRight?: boolean
  /** Нижний край меню совмещается с y (меню «вверх» от точки). */
  alignBottom?: boolean
  /** Элемент, подсвеченный на время показа меню. */
  ownerEl?: HTMLElement
  onClose?: () => void
}

/** Открывает всплывающее меню верхнего уровня. */
export function showMenu(items: MenuItem[], place: MenuPlacement): HTMLElement {
  closeAllMenus()
  bindDismiss()
  const el = buildMenu(items, 0, place.onClose)
  document.body.appendChild(el)
  position(el, place)
  stack.push({ el, items, parentItemEl: place.ownerEl })
  place.ownerEl?.classList.add('hot')
  return el
}

function position(el: HTMLElement, place: MenuPlacement): void {
  const w = el.offsetWidth
  const h = el.offsetHeight
  let x = place.alignRight ? place.x - w : place.x
  let y = place.alignBottom ? place.y - h : place.y

  if (x + w > window.innerWidth) x = window.innerWidth - w
  if (x < 0) x = 0
  const maxY = window.innerHeight - TASKBAR_H
  if (y + h > maxY) y = maxY - h
  if (y < 0) y = 0

  el.style.left = Math.round(x) + 'px'
  el.style.top = Math.round(y) + 'px'
}

function buildMenu(items: MenuItem[], depth: number, onClose?: () => void): HTMLElement {
  const el = document.createElement('div')
  el.className = 'menu-popup'
  el.dataset.depth = String(depth)

  const hasIcons = items.some((i) => i.icon || i.checked)

  el.innerHTML = items.map((item, index) => {
    if (item.separator) return '<div class="menu-popup__sep"></div>'
    const cls = [
      'menu-popup__item',
      item.disabled ? 'menu-popup__item--disabled' : '',
      item.items ? 'menu-popup__item--sub' : '',
      item.bold ? 'menu-popup__item--default' : '',
      item.checked ? 'menu-popup__item--checked' : '',
    ].filter(Boolean).join(' ')
    const gutter = hasIcons
      ? `<span class="menu-popup__icon">${item.icon ? icon(item.icon, 16) : ''}</span>`
      : '<span class="menu-popup__icon" style="width:4px"></span>'
    const shortcut = item.shortcut ? `<span class="menu-popup__accel">${item.shortcut}</span>` : ''
    return `<div class="${cls}" data-index="${index}">${gutter}<span class="menu-popup__label">${accel(item.label ?? '')}</span>${shortcut}</div>`
  }).join('')

  el.querySelectorAll<HTMLElement>('.menu-popup__item').forEach((itemEl) => {
    const item = items[Number(itemEl.dataset.index)]

    itemEl.addEventListener('mouseenter', () => {
      closeDownTo(depth + 1)
      el.querySelectorAll('.menu-popup__item.hot').forEach((n) => n.classList.remove('hot'))
      if (item.disabled) return
      itemEl.classList.add('hot')
      if (item.items) openSubmenu(itemEl, item.items, depth + 1)
    })

    itemEl.addEventListener('mouseup', (e) => {
      e.stopPropagation()
      if (item.disabled || item.items) return
      const action = item.action
      closeAllMenus()
      onClose?.()
      action?.()
    })
  })

  el.addEventListener('contextmenu', (e) => e.preventDefault())
  return el
}

function openSubmenu(parentItemEl: HTMLElement, items: MenuItem[], depth: number): void {
  const sub = buildMenu(items, depth)
  document.body.appendChild(sub)

  const rect = parentItemEl.getBoundingClientRect()
  const w = sub.offsetWidth
  const h = sub.offsetHeight

  let x = rect.right - 3
  if (x + w > window.innerWidth) x = Math.max(0, rect.left - w + 3)
  let y = rect.top - 3
  const maxY = window.innerHeight - TASKBAR_H
  if (y + h > maxY) y = Math.max(0, maxY - h)

  sub.style.left = Math.round(x) + 'px'
  sub.style.top = Math.round(y) + 'px'

  parentItemEl.classList.add('hot')
  stack.push({ el: sub, items, parentItemEl })
}

/** Открывает подменю, привязанное к пункту уже показанного меню (для «Пуска»). */
export function showSubmenuFor(parentItemEl: HTMLElement, items: MenuItem[]): void {
  bindDismiss()
  openSubmenu(parentItemEl, items, stack.length)
}

export function menusOpen(): boolean {
  return stack.length > 0
}
