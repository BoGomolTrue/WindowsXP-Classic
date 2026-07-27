import { accel, escapeHtml, icon } from '../utils/helpers'
import { closeAllMenus, showMenu, type MenuItem } from '../ui/Menu'
import { showMessage } from '../dialogs/MessageBox'
import { playClick, playMinimize, playRestore } from '../utils/sounds'

export interface WindowMenu {
  label: string
  items: MenuItem[]
}

export interface WindowOptions {
  title: string
  icon?: string
  width?: number
  height?: number
  x?: number
  y?: number
  resizable?: boolean
  minimizable?: boolean
  maximizable?: boolean
  /** Диалог: тонкая неизменяемая рамка, без кнопок «Свернуть»/«Развернуть». */
  dialog?: boolean
  /** Массив либо функция — функция вызывается при каждом открытии меню. */
  menu?: WindowMenu[] | (() => WindowMenu[])
  content: HTMLElement | string
  onClose?: () => void
  /** Звук при закрытии окна (по умолчанию включён). */
  closeSound?: boolean
}

export interface WindowInstance {
  id: string
  el: HTMLElement
  caption: HTMLElement
  captionText: HTMLElement
  client: HTMLElement
  maxBtn: HTMLElement | null
  options: WindowOptions
  minimized: boolean
  maximized: boolean
  restoreBounds?: { x: number; y: number; w: number; h: number }
}

const TASKBAR_H = 30

const WIN_BTN_IMG = {
  min: '/images/xp/icons/Minimize.png',
  max: '/images/xp/icons/Maximize.png',
  restore: '/images/xp/icons/Restore.png',
  close: '/images/xp/icons/Exit.png',
}
const MIN_W = 120
const MIN_H = 60

let nextId = 1

export class WindowManager {
  private windows = new Map<string, WindowInstance>()
  private zIndex = 1000
  private activeId: string | null = null
  private onChange: (() => void) | null = null

  setOnChange(cb: () => void): void {
    this.onChange = cb
  }

  open(opts: WindowOptions): string {
    const id = `win-${nextId++}`
    const host = document.querySelector('.desktop')!

    const w = opts.width ?? 640
    const h = opts.height ?? 480
    const cascade = (this.windows.size % 8) * 24
    const x = opts.x ?? Math.max(0, Math.round((window.innerWidth - w) / 2) - 80 + cascade)
    const y = opts.y ?? Math.max(0, Math.round((window.innerHeight - TASKBAR_H - h) / 2) - 40 + cascade)

    const resizable = opts.resizable !== false && !opts.dialog
    const minimizable = opts.minimizable !== false && !opts.dialog
    const maximizable = opts.maximizable !== false && !opts.dialog

    const el = document.createElement('div')
    el.className = 'win' + (opts.dialog ? ' win--dialog' : '')
    el.dataset.winId = id
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${++this.zIndex}`

    el.innerHTML = `
      <div class="win__caption" data-role="caption">
        ${opts.icon ? icon(opts.icon, 16, 'win__caption-icon') : ''}
        <span class="win__caption-text">${escapeHtml(opts.title)}</span>
        <div class="win__caption-btns">
          ${minimizable ? `<button class="win__btn win__btn--min" data-role="minimize" title="Свернуть"><img src="${WIN_BTN_IMG.min}" alt=""></button>` : ''}
          ${maximizable ? `<button class="win__btn win__btn--max" data-role="maximize" title="Развернуть"><img src="${WIN_BTN_IMG.max}" alt=""></button>` : ''}
          <button class="win__btn win__btn--close" data-role="close" title="Закрыть"><img src="${WIN_BTN_IMG.close}" alt=""></button>
        </div>
      </div>
      ${opts.menu ? '<div class="win__menubar" data-role="menubar"></div>' : ''}
      <div class="win__client" data-role="client"></div>
      ${resizable ? ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se']
        .map((d) => `<div class="win__resize win__resize--${d}" data-resize="${d}"></div>`).join('') : ''}
    `

    const client = el.querySelector<HTMLElement>('[data-role="client"]')!
    if (typeof opts.content === 'string') client.innerHTML = opts.content
    else client.appendChild(opts.content)

    host.appendChild(el)

    const win: WindowInstance = {
      id,
      el,
      caption: el.querySelector('[data-role="caption"]')!,
      captionText: el.querySelector('.win__caption-text')!,
      client,
      maxBtn: el.querySelector('[data-role="maximize"]'),
      options: opts,
      minimized: false,
      maximized: false,
    }

    this.windows.set(id, win)
    if (opts.menu) {
      const provider = typeof opts.menu === 'function' ? opts.menu : () => opts.menu as WindowMenu[]
      this.buildMenuBar(win, provider)
    }
    this.bind(win)
    this.focus(id)
    this.emit()
    return id
  }

  close(id: string): void {
    const win = this.windows.get(id)
    if (!win) return
    if (win.options.closeSound !== false) playClick()
    win.options.onClose?.()
    win.el.remove()
    this.windows.delete(id)
    if (this.activeId === id) {
      this.activeId = null
      this.focusTopMost()
    }
    this.emit()
  }

  minimize(id: string): void {
    const win = this.windows.get(id)
    if (!win) return
    playMinimize()
    win.minimized = true
    win.el.style.display = 'none'
    if (this.activeId === id) {
      this.activeId = null
      this.focusTopMost()
    }
    this.emit()
  }

  restore(id: string): void {
    const win = this.windows.get(id)
    if (!win) return
    playRestore()
    win.minimized = false
    win.el.style.display = ''
    this.focus(id)
  }

  toggleMaximize(id: string): void {
    const win = this.windows.get(id)
    if (!win || !win.maxBtn) return

    if (win.maximized) {
      win.maximized = false
      const b = win.restoreBounds
      if (b) {
        win.el.style.left = b.x + 'px'
        win.el.style.top = b.y + 'px'
        win.el.style.width = b.w + 'px'
        win.el.style.height = b.h + 'px'
      }
      win.maxBtn.className = 'win__btn win__btn--max'
      const maxImg = win.maxBtn.querySelector('img')
      if (maxImg) maxImg.src = WIN_BTN_IMG.max
      win.maxBtn.title = 'Развернуть'
    } else {
      win.restoreBounds = {
        x: win.el.offsetLeft,
        y: win.el.offsetTop,
        w: win.el.offsetWidth,
        h: win.el.offsetHeight,
      }
      win.maximized = true
      win.el.style.left = '0px'
      win.el.style.top = '0px'
      win.el.style.width = '100%'
      win.el.style.height = `calc(100% - ${TASKBAR_H}px)`
      win.maxBtn.className = 'win__btn win__btn--restore'
      const maxImg = win.maxBtn.querySelector('img')
      if (maxImg) maxImg.src = WIN_BTN_IMG.restore
      win.maxBtn.title = 'Восстановить'
    }
  }

  focus(id: string): void {
    const win = this.windows.get(id)
    if (!win) return
    this.activeId = id
    win.el.style.zIndex = String(++this.zIndex)
    this.windows.forEach((w) => w.el.classList.toggle('win--active', w.id === id))
    this.emit()
  }

  setTitle(id: string, title: string): void {
    const win = this.windows.get(id)
    if (!win) return
    win.captionText.textContent = title
    win.options.title = title
    this.emit()
  }

  /** Подгоняет размеры окна (диалоги измеряют содержимое после вставки). */
  setSize(id: string, w?: number, h?: number, center = false): void {
    const win = this.windows.get(id)
    if (!win) return
    if (w) win.el.style.width = w + 'px'
    if (h) win.el.style.height = h + 'px'
    if (center) {
      win.el.style.left = Math.max(0, Math.round((window.innerWidth - win.el.offsetWidth) / 2)) + 'px'
      win.el.style.top = Math.max(0, Math.round((window.innerHeight - TASKBAR_H - win.el.offsetHeight) / 2)) + 'px'
    }
  }

  getWindows(): WindowInstance[] {
    return Array.from(this.windows.values())
  }

  getActiveId(): string | null {
    return this.activeId
  }

  minimizeAll(): void {
    this.windows.forEach((w) => {
      if (!w.minimized) this.minimize(w.id)
    })
  }

  cascadeWindows(): void {
    const visible = this.getWindows().filter((w) => !w.minimized && !w.options.dialog)
    visible.forEach((win, index) => {
      if (win.maximized) this.toggleMaximize(win.id)
      const w = win.options.width ?? 640
      const h = win.options.height ?? 480
      win.el.style.left = `${24 + index * 28}px`
      win.el.style.top = `${24 + index * 28}px`
      win.el.style.width = `${w}px`
      win.el.style.height = `${h}px`
      this.focus(win.id)
    })
  }

  tileWindowsHorizontal(): void {
    const visible = this.getWindows().filter((w) => !w.minimized && !w.options.dialog)
    if (!visible.length) return
    const h = Math.max(MIN_H, Math.floor((window.innerHeight - TASKBAR_H) / visible.length))
    visible.forEach((win, index) => {
      if (win.maximized) this.toggleMaximize(win.id)
      win.el.style.left = '0px'
      win.el.style.top = `${index * h}px`
      win.el.style.width = '100%'
      win.el.style.height = `${h}px`
    })
  }

  tileWindowsVertical(): void {
    const visible = this.getWindows().filter((w) => !w.minimized && !w.options.dialog)
    if (!visible.length) return
    const w = Math.max(MIN_W, Math.floor(window.innerWidth / visible.length))
    visible.forEach((win, index) => {
      if (win.maximized) this.toggleMaximize(win.id)
      win.el.style.left = `${index * w}px`
      win.el.style.top = '0px'
      win.el.style.width = `${w}px`
      win.el.style.height = `calc(100% - ${TASKBAR_H}px)`
    })
  }

  startKeyboardMove(id: string): void {
    const win = this.windows.get(id)
    if (!win || win.maximized) return
    void showMessage('Используйте клавиши со стрелками для перемещения окна.\nEnter — завершить, Esc — отмена.', win.options.title, 'info')
    const step = () => 8
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); return }
      if (e.key === 'Enter') { document.removeEventListener('keydown', onKey); return }
      let x = win.el.offsetLeft
      let y = win.el.offsetTop
      if (e.key === 'ArrowLeft') x -= step()
      if (e.key === 'ArrowRight') x += step()
      if (e.key === 'ArrowUp') y = Math.max(0, y - step())
      if (e.key === 'ArrowDown') y += step()
      win.el.style.left = `${x}px`
      win.el.style.top = `${y}px`
    }
    document.addEventListener('keydown', onKey)
  }

  startKeyboardResize(id: string): void {
    const win = this.windows.get(id)
    if (!win || win.maximized) return
    void showMessage('Используйте клавиши со стрелками для изменения размера.\nEnter — завершить, Esc — отмена.', win.options.title, 'info')
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') { document.removeEventListener('keydown', onKey); return }
      let w = win.el.offsetWidth
      let h = win.el.offsetHeight
      if (e.key === 'ArrowRight') w += 8
      if (e.key === 'ArrowLeft') w = Math.max(MIN_W, w - 8)
      if (e.key === 'ArrowDown') h += 8
      if (e.key === 'ArrowUp') h = Math.max(MIN_H, h - 8)
      win.el.style.width = `${w}px`
      win.el.style.height = `${h}px`
    }
    document.addEventListener('keydown', onKey)
  }

  private focusTopMost(): void {
    let topZ = -1
    let topId: string | null = null
    this.windows.forEach((w) => {
      if (w.minimized) return
      const z = Number(w.el.style.zIndex || 0)
      if (z > topZ) {
        topZ = z
        topId = w.id
      }
    })
    if (topId) this.focus(topId)
    else this.emit()
  }

  private emit(): void {
    this.onChange?.()
  }

  private buildMenuBar(win: WindowInstance, provider: () => WindowMenu[]): void {
    const bar = win.el.querySelector<HTMLElement>('[data-role="menubar"]')!
    bar.innerHTML = provider()
      .map((m, i) => `<div class="win__menubar-item" data-menu="${i}">${accel(m.label)}</div>`)
      .join('')

    let open = -1

    const openAt = (index: number, itemEl: HTMLElement) => {
      const rect = itemEl.getBoundingClientRect()
      open = index
      itemEl.classList.add('open')
      showMenu(provider()[index].items, {
        x: rect.left,
        y: rect.bottom,
        onClose: () => {
          itemEl.classList.remove('open')
          open = -1
        },
      })
      const clear = () => {
        itemEl.classList.remove('open')
        if (open === index) open = -1
        document.removeEventListener('mousedown', clear, true)
      }
      setTimeout(() => document.addEventListener('mousedown', clear, true), 0)
    }

    bar.querySelectorAll<HTMLElement>('.win__menubar-item').forEach((itemEl, index) => {
      itemEl.addEventListener('mousedown', (e) => {
        e.stopPropagation()
        if (open === index) {
          closeAllMenus()
          itemEl.classList.remove('open')
          open = -1
          return
        }
        closeAllMenus()
        openAt(index, itemEl)
      })
      itemEl.addEventListener('mouseenter', () => {
        if (open >= 0 && open !== index) {
          bar.querySelectorAll('.win__menubar-item').forEach((n) => n.classList.remove('open'))
          closeAllMenus()
          openAt(index, itemEl)
        }
      })
    })
  }

  private systemMenu(win: WindowInstance): MenuItem[] {
    return [
      { label: '&Восстановить', disabled: !win.maximized, action: () => this.toggleMaximize(win.id) },
      { label: 'Пере&местить', action: () => this.startKeyboardMove(win.id) },
      { label: '&Размер', action: () => this.startKeyboardResize(win.id) },
      { label: 'Сверн&уть', disabled: !win.maxBtn && !win.options.minimizable, action: () => this.minimize(win.id) },
      { label: 'Развер&нуть', disabled: !win.maxBtn || win.maximized, action: () => this.toggleMaximize(win.id) },
      { separator: true },
      { label: '&Закрыть', shortcut: 'Alt+F4', bold: true, action: () => this.close(win.id) },
    ]
  }

  private bind(win: WindowInstance): void {
    const el = win.el

    el.addEventListener('mousedown', () => this.focus(win.id), true)

    // Кнопки заголовка
    el.querySelectorAll<HTMLElement>('.win__caption-btns [data-role]').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => e.stopPropagation())
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const role = btn.dataset.role
        if (role !== 'close') playClick()
        if (role === 'close') this.close(win.id)
        else if (role === 'minimize') this.minimize(win.id)
        else if (role === 'maximize') this.toggleMaximize(win.id)
      })
    })

    // Системное меню на значке и правой кнопке по заголовку
    const captionIcon = win.caption.querySelector<HTMLElement>('.win__caption-icon')
    captionIcon?.addEventListener('mousedown', (e) => {
      e.stopPropagation()
      const rect = win.caption.getBoundingClientRect()
      showMenu(this.systemMenu(win), { x: rect.left, y: rect.bottom })
    })
    win.caption.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      showMenu(this.systemMenu(win), { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY })
    })

    // Перемещение за заголовок
    win.caption.addEventListener('mousedown', (e) => {
      const me = e as MouseEvent
      if (me.button !== 0) return
      if ((me.target as HTMLElement).closest('.win__caption-btns, .win__caption-icon')) return
      if (win.maximized) return
      me.preventDefault()

      const startX = me.clientX
      const startY = me.clientY
      const originX = el.offsetLeft
      const originY = el.offsetTop

      const onMove = (ev: MouseEvent) => {
        el.style.left = originX + ev.clientX - startX + 'px'
        el.style.top = Math.max(0, originY + ev.clientY - startY) + 'px'
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })

    win.caption.addEventListener('dblclick', (e) => {
      if ((e.target as HTMLElement).closest('.win__caption-btns')) return
      this.toggleMaximize(win.id)
    })

    // Изменение размера
    el.querySelectorAll<HTMLElement>('[data-resize]').forEach((handle) => {
      handle.addEventListener('mousedown', (e) => {
        const me = e as MouseEvent
        if (me.button !== 0 || win.maximized) return
        me.preventDefault()
        me.stopPropagation()

        const dir = handle.dataset.resize!
        const startX = me.clientX
        const startY = me.clientY
        const box = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }

        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startX
          const dy = ev.clientY - startY
          let { x, y, w, h } = box

          if (dir.includes('e')) w = Math.max(MIN_W, box.w + dx)
          if (dir.includes('s')) h = Math.max(MIN_H, box.h + dy)
          if (dir.includes('w')) {
            w = Math.max(MIN_W, box.w - dx)
            x = box.x + (box.w - w)
          }
          if (dir.includes('n')) {
            h = Math.max(MIN_H, box.h - dy)
            y = box.y + (box.h - h)
          }

          el.style.left = x + 'px'
          el.style.top = y + 'px'
          el.style.width = w + 'px'
          el.style.height = h + 'px'
        }
        const onUp = () => {
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onUp)
        }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
      })
    })
  }
}

export const windowManager = new WindowManager()
