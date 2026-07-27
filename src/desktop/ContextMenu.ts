export interface ContextMenuItem {
  label: string
  icon?: string
  separator?: boolean
  disabled?: boolean
  action?: () => void
  children?: ContextMenuItem[]
}

let activeMenu: HTMLElement | null = null

export function showContextMenu(x: number, y: number, items: ContextMenuItem[]): void {
  removeContextMenu()

  const menu = document.createElement('div')
  menu.className = 'xp-contextmenu'
  menu.style.left = x + 'px'
  menu.style.top = y + 'px'

  menu.innerHTML = items.map((item) => {
    if (item.separator) return '<div class="xp-contextmenu__sep"></div>'
    const cls = [
      'xp-contextmenu__item',
      item.disabled ? 'xp-contextmenu__item--disabled' : '',
      item.children ? 'xp-contextmenu__item--has-submenu' : '',
    ].filter(Boolean).join(' ')
    return `<div class="${cls}" data-label="${escapeAttr(item.label)}">${escapeHtml(item.label)}${item.children ? '<span class="xp-contextmenu__arrow">▸</span>' : ''}</div>`
  }).join('')

  document.body.appendChild(menu)
  activeMenu = menu

  menu.querySelectorAll('.xp-contextmenu__item').forEach((el) => {
    el.addEventListener('click', () => {
      const label = (el as HTMLElement).dataset.label
      const item = items.find((i) => !i.separator && i.label === label)
      if (item && !item.disabled && item.action) {
        item.action()
      }
      removeContextMenu()
    })
  })

  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect()
    if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 4) + 'px'
    if (rect.bottom > window.innerHeight - 28) menu.style.top = (window.innerHeight - 28 - rect.height - 4) + 'px'
  })

  setTimeout(() => {
    document.addEventListener('click', removeContextMenu, { once: true })
    document.addEventListener('contextmenu', removeContextMenu, { once: true })
  }, 0)
}

export function removeContextMenu(): void {
  if (activeMenu) {
    activeMenu.remove()
    activeMenu = null
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}
