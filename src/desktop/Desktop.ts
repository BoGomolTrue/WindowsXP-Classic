import {
  DESKTOP_ICON_HEIGHT,
  DESKTOP_ICON_WIDTH,
  type DesktopIcon,
} from '../data/icons'
import {
  addDesktopFolderNode,
  addDesktopShortcutNode,
  alignIconsToGrid,
  desktopFsPath,
  findFreeCell,
  loadDesktopIcons,
  newDesktopId,
  removeDesktopNode,
  renameDesktopNode,
  saveDesktopIcons,
  shortcutIconForTarget,
  snapIconPosition,
  uniqueDesktopName,
} from '../data/desktop-store'
import {
  PATH_CONTROL_PANEL,
  PATH_DESKTOP,
  PATH_MY_COMPUTER,
  PATH_MY_DOCUMENTS,
  PATH_MY_MUSIC,
  PATH_MY_PICTURES,
  PATH_NETWORK,
  findNode,
} from '../data/filesystem'
import { openFsPath } from '../apps/openFile'
import { accel, clampToWorkArea, escapeHtml, formatClock, icon } from '../utils/helpers'
import { windowManager } from '../windows/WindowManager'
import { openExplorer } from '../windows/Explorer'
import { openMediaPlayer } from '../windows/MediaPlayer'
import { openInternetExplorer } from '../windows/InternetExplorer'
import { openTelegram } from '../windows/Telegram'
import { showMessage } from '../dialogs/MessageBox'
import { showPrompt } from '../dialogs/PromptDialog'
import { showProperties } from '../dialogs/PropertiesDialog'
import { showAbout } from '../dialogs/AboutDialog'
import { closeAllMenus, showMenu, showSubmenuFor, type MenuItem } from '../ui/Menu'
import { launchByName, showRunDialog } from '../apps/run'
import { openSearchDialog } from '../apps/SearchDialog'
import { openTaskManager } from '../apps/TaskManager'
import { getRecycleItems, isRecycleEmpty, emptyRecycleBin, restoreFromRecycle } from '../data/recycle-bin'
import { addUserDesktopIcon, DESKTOP_CHANGED } from '../data/desktop-sync'
import { addTextFile, copyChildren } from '../data/filesystem-store'
import { canPaste, consumePaste, copyItems, cutItems } from '../data/clipboard'
import { applyWallpaper } from '../data/wallpaper'
import { playClick } from '../utils/sounds'

export class Desktop {
  private root: HTMLElement
  private startOpen = false
  private clockEl!: HTMLElement
  private startBtn!: HTMLElement
  private startMenu!: HTMLElement
  private startItemsEl!: HTMLElement
  private startRightEl!: HTMLElement
  private tasksEl!: HTMLElement
  private iconsHost!: HTMLElement
  private items: MenuItem[] = []
  private icons: DesktopIcon[] = loadDesktopIcons()
  private selectedIds = new Set<string>()
  private selectionAnchor: string | null = null
  private renamingId: string | null = null
  private renameUndo: { id: string; label: string } | null = null
  private iconsVisible = true
  private qlVisible = true
  private taskbarLocked = true

  constructor(container: HTMLElement) {
    this.root = container
    this.render()
    applyWallpaper()
    this.items = this.startMenuItems()
    this.renderStartMenu()
    this.bind()
    this.tick()
    setInterval(() => this.tick(), 1000)
    windowManager.setOnChange(() => this.renderTasks())
    window.addEventListener(DESKTOP_CHANGED, () => {
      this.icons = loadDesktopIcons()
      this.renderIcons()
    })
  }

  private render(): void {
    this.root.className = 'desktop'
    this.root.innerHTML = `
      <div class="desktop__icons"></div>

      <div class="start-menu" id="start-menu">
        <div class="start-menu__shine"></div>
        <div class="start-menu__header"></div>
        <div class="start-menu__orange"></div>
        <div class="start-menu__body">
          <div class="start-menu__left" id="start-items-left"></div>
          <div class="start-menu__right" id="start-items-right"></div>
        </div>
        <div class="start-menu__footer">
          <button class="start-menu__footer-btn" id="start-logoff" type="button">
            <img src="/images/xp/icons/Logout.png" alt="">
            <span>Выход из системы</span>
          </button>
          <button class="start-menu__footer-btn" id="start-shutdown" type="button">
            <img src="/images/xp/icons/Power.png" alt="">
            <span>Завершение работы</span>
          </button>
        </div>
      </div>

      <div class="taskbar">
        <button class="taskbar__start" id="start-btn" type="button" title="Пуск">
          <img class="taskbar__start-logo" src="/images/ms.png" width="20" height="20" alt="">
          <span class="taskbar__start-label">Пуск</span>
        </button>
        <div class="taskbar__sep"></div>
        <div class="taskbar__quicklaunch">
          <button class="taskbar__ql-btn" type="button" data-ql="desktop" title="Свернуть все окна">${icon('icon-showdesktop', 16)}</button>
          <button class="taskbar__ql-btn" type="button" data-ql="ie" title="Запуск обозревателя Internet Explorer">${icon('icon-ie', 16)}</button>
          <button class="taskbar__ql-btn" type="button" data-ql="outlook" title="Запуск Outlook Express">${icon('icon-outlook', 16)}</button>
          <button class="taskbar__ql-btn" type="button" data-ql="wmp" title="Запуск Windows Media Player">${icon('icon-mediaplayer', 16)}</button>
        </div>
        <div class="taskbar__sep"></div>
        <div class="taskbar__tasks" id="tasks"></div>
        <div class="taskbar__tray">
          ${icon('icon-tray-volume', 16, 'taskbar__tray-icon')}
          ${icon('icon-tray-network', 16, 'taskbar__tray-icon')}
          <span class="taskbar__clock" id="clock"></span>
        </div>
      </div>
    `

    this.clockEl = this.root.querySelector('#clock')!
    this.startBtn = this.root.querySelector('#start-btn')!
    this.startMenu = this.root.querySelector('#start-menu')!
    this.startItemsEl = this.root.querySelector('#start-items-left')!
    this.startRightEl = this.root.querySelector('#start-items-right')!
    this.tasksEl = this.root.querySelector('#tasks')!
    this.iconsHost = this.root.querySelector('.desktop__icons')!
    this.renderIcons()
  }

  private renderIcons(): void {
    this.iconsHost.style.display = this.iconsVisible ? '' : 'none'
    this.iconsHost.innerHTML = this.icons.map((it) => {
      const selected = this.selectedIds.has(it.id)
      const renaming = it.id === this.renamingId
      const labelHtml = renaming
        ? `<input class="desktop-icon__input xp-input" type="text" value="${escapeHtml(it.label)}" />`
        : `<span class="desktop-icon__label">${escapeHtml(it.label)}</span>`
      return `
        <div class="desktop-icon${selected ? ' selected' : ''}" data-id="${it.id}" style="left:${it.x}px;top:${it.y}px">
          ${icon(it.icon, 32, 'desktop-icon__img')}
          ${labelHtml}
        </div>`
    }).join('')

    this.iconsHost.querySelectorAll<HTMLElement>('.desktop-icon').forEach((el) => {
      this.bindIconEvents(el)
    })
    this.bindDesktopMarquee()
  }

  private sortedIconIds(): string[] {
    return [...this.icons].sort((a, b) => a.y - b.y || a.x - b.x).map((item) => item.id)
  }

  private handleIconSelect(id: string, e: MouseEvent): void {
    if (e.ctrlKey || e.metaKey) {
      if (this.selectedIds.has(id)) this.selectedIds.delete(id)
      else this.selectedIds.add(id)
      this.selectionAnchor = id
    } else if (e.shiftKey && this.selectionAnchor) {
      const ids = this.sortedIconIds()
      const from = ids.indexOf(this.selectionAnchor)
      const to = ids.indexOf(id)
      if (from >= 0 && to >= 0) {
        this.selectedIds.clear()
        const [start, end] = from < to ? [from, to] : [to, from]
        for (let i = start; i <= end; i += 1) this.selectedIds.add(ids[i]!)
      }
    } else if (!this.selectedIds.has(id)) {
      this.selectedIds.clear()
      this.selectedIds.add(id)
      this.selectionAnchor = id
    } else {
      this.selectionAnchor = id
    }
    this.markIconSelection()
  }

  private bindDesktopMarquee(): void {
    this.iconsHost.onmousedown = (e) => {
      const me = e as MouseEvent
      if (me.button !== 0) return
      if ((me.target as HTMLElement).closest('.desktop-icon')) return

      me.preventDefault()
      me.stopPropagation()
      const startX = me.clientX
      const startY = me.clientY
      let marquee: HTMLElement | null = null
      let dragged = false

      const onMove = (ev: MouseEvent) => {
        const dx = Math.abs(ev.clientX - startX)
        const dy = Math.abs(ev.clientY - startY)
        if (!dragged && dx < 4 && dy < 4) return
        dragged = true

        if (!marquee) {
          marquee = document.createElement('div')
          marquee.className = 'desktop__marquee'
          this.iconsHost.appendChild(marquee)
        }

        const rect = this.iconsHost.getBoundingClientRect()
        const left = Math.min(startX, ev.clientX) - rect.left + this.iconsHost.scrollLeft
        const top = Math.min(startY, ev.clientY) - rect.top + this.iconsHost.scrollTop
        marquee.style.left = `${left}px`
        marquee.style.top = `${top}px`
        marquee.style.width = `${Math.abs(ev.clientX - startX)}px`
        marquee.style.height = `${Math.abs(ev.clientY - startY)}px`

        const box = marquee.getBoundingClientRect()
        this.selectedIds.clear()
        this.iconsHost.querySelectorAll<HTMLElement>('.desktop-icon').forEach((iconEl) => {
          const iconBox = iconEl.getBoundingClientRect()
          const hit = !(iconBox.right < box.left || iconBox.left > box.right || iconBox.bottom < box.top || iconBox.top > box.bottom)
          if (hit) this.selectedIds.add(iconEl.dataset.id!)
        })
        this.markIconSelection()
      }

      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        marquee?.remove()
        if (!dragged) {
          this.deselect()
        } else if (this.selectedIds.size === 1) {
          this.selectionAnchor = this.selectedIds.values().next().value ?? null
        }
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }
  }

  private markIconSelection(): void {
    this.iconsHost.querySelectorAll<HTMLElement>('.desktop-icon').forEach((el) => {
      el.classList.toggle('selected', this.selectedIds.has(el.dataset.id!))
    })
  }

  private renderStartMenu(): void {
    this.renderStartMenuLeft()
    this.renderStartMenuRight()
  }

  private isStartFooterItem(item: MenuItem): boolean {
    const label = item.label ?? ''
    return label.includes('Выход') || label.includes('Заверш')
  }

  private isStartMenuBold(item: MenuItem): boolean {
    const label = item.label ?? ''
    return label.includes('Программы') || label.includes('Документ') || label.includes('Internet')
  }

  private renderStartMenuLeft(): void {
    const entries = this.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !this.isStartFooterItem(item))

    this.startItemsEl.innerHTML = entries.map(({ item, index }) => {
      if (item.separator) return '<div class="start-menu__sep"></div>'
      const cls = 'start-menu__item'
        + (item.items ? ' start-menu__item--sub' : '')
        + (this.isStartMenuBold(item) ? ' start-menu__item--bold' : '')
      return `<div class="${cls}" data-index="${index}">${icon(item.icon ?? 'icon-file', 32)}<span>${accel(item.label ?? '')}</span></div>`
    }).join('')

    this.startItemsEl.querySelectorAll<HTMLElement>('.start-menu__item').forEach((el) => {
      const item = this.items[Number(el.dataset.index)]

      el.addEventListener('mouseenter', () => {
        closeAllMenus()
        this.startItemsEl.querySelectorAll('.hot').forEach((n) => n.classList.remove('hot'))
        this.startRightEl.querySelectorAll('.hot').forEach((n) => n.classList.remove('hot'))
        el.classList.add('hot')
        if (item.items) showSubmenuFor(el, item.items)
      })

      el.addEventListener('mouseup', () => {
        if (item.items) return
        this.closeStart()
        item.action?.()
      })
    })
  }

  private startMenuRightLinks(): { label: string; icon: string; bold?: boolean; action: () => void }[] {
    return [
      { label: 'Мои рисунки', icon: 'MyPictures.png', bold: true, action: () => openExplorer(PATH_MY_PICTURES) },
      { label: 'Моя музыка', icon: 'MyMusic.png', bold: true, action: () => openExplorer(PATH_MY_MUSIC) },
      { label: 'Мой компьютер', icon: 'MyComputer.png', bold: true, action: () => openExplorer(PATH_MY_COMPUTER) },
      { label: 'Мои документы', icon: 'MyPictures.png', bold: true, action: () => openExplorer(PATH_MY_DOCUMENTS) },
      { label: 'Панель управления', icon: 'ControlPanel.png', action: () => openExplorer(PATH_CONTROL_PANEL) },
      { label: 'Поиск', icon: 'Search.png', action: () => openSearchDialog() },
      { label: 'Справка и поддержка', icon: 'Programs.png', action: () => launchByName('Центр справки и поддержки') },
      { label: 'Выполнить...', icon: 'Run.png', action: () => void showRunDialog() },
    ]
  }

  private renderStartMenuRight(): void {
    const links = this.startMenuRightLinks()
    this.startRightEl.innerHTML = links.map((link, i) => `
      <div class="start-menu__item start-menu__item--right${link.bold ? ' start-menu__item--bold' : ''}" data-right="${i}">
        <img class="start-menu__item-icon" src="/images/xp/icons/${link.icon}" width="28" height="28" alt="">
        <span>${escapeHtml(link.label)}</span>
      </div>
    `).join('')

    this.startRightEl.querySelectorAll<HTMLElement>('.start-menu__item').forEach((el) => {
      const link = links[Number(el.dataset.right)]
      el.addEventListener('mouseenter', () => {
        closeAllMenus()
        this.startItemsEl.querySelectorAll('.hot').forEach((n) => n.classList.remove('hot'))
        this.startRightEl.querySelectorAll('.hot').forEach((n) => n.classList.remove('hot'))
        el.classList.add('hot')
      })
      el.addEventListener('mouseup', () => {
        this.closeStart()
        link.action()
      })
    })
  }

  private bindIconEvents(el: HTMLElement): void {
    const id = el.dataset.id!

    el.addEventListener('dragstart', (e) => e.preventDefault())

    el.addEventListener('mousedown', (e) => {
      const me = e as MouseEvent
      if (me.button !== 0) return
      if ((me.target as HTMLElement).closest('.desktop-icon__input')) return
      me.stopPropagation()
      this.handleIconSelect(id, me)

      const dragIds = this.selectedIds.size > 1 && this.selectedIds.has(id) ? [...this.selectedIds] : [id]
      const dragEls = dragIds.map((dragId) => this.iconsHost.querySelector<HTMLElement>(`.desktop-icon[data-id="${dragId}"]`)!)
      const origins = new Map(dragIds.map((dragId) => {
        const item = this.icons.find((iconItem) => iconItem.id === dragId)!
        return [dragId, { x: item.x, y: item.y, el: this.iconsHost.querySelector<HTMLElement>(`.desktop-icon[data-id="${dragId}"]`)! }]
      }))

      const startX = me.clientX
      const startY = me.clientY
      let dragging = false

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        if (!dragging && Math.hypot(dx, dy) < 4) return
        dragging = true
        for (const dragId of dragIds) {
          const origin = origins.get(dragId)!
          origin.el.classList.add('desktop-icon--dragging')
          const pos = clampToWorkArea(origin.x + dx, origin.y + dy, DESKTOP_ICON_WIDTH, DESKTOP_ICON_HEIGHT)
          origin.el.style.left = `${pos.x}px`
          origin.el.style.top = `${pos.y}px`
        }
      }

      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        dragEls.forEach((dragEl) => dragEl.classList.remove('desktop-icon--dragging'))
        if (!dragging) return

        const anchorEl = origins.get(id)!.el
        const snapped = snapIconPosition(anchorEl.offsetLeft, anchorEl.offsetTop)
        const anchorItem = this.icons.find((iconItem) => iconItem.id === id)
        if (!anchorItem) return
        const shiftX = snapped.x - anchorItem.x
        const shiftY = snapped.y - anchorItem.y

        const targets = new Map<string, string>()
        for (const dragId of dragIds) {
          const item = this.icons.find((iconItem) => iconItem.id === dragId)
          if (!item) continue
          const next = snapIconPosition(item.x + shiftX, item.y + shiftY)
          targets.set(`${next.x},${next.y}`, dragId)
          item.x = next.x
          item.y = next.y
        }

        for (const iconItem of this.icons) {
          if (dragIds.includes(iconItem.id)) continue
          const key = `${iconItem.x},${iconItem.y}`
          if (targets.has(key)) {
            const free = findFreeCell(this.icons)
            iconItem.x = free.x
            iconItem.y = free.y
          }
        }

        this.persistIcons()
        this.renderIcons()
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })

    el.addEventListener('dblclick', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if ((e.target as HTMLElement).closest('.desktop-icon__input')) return
      this.openIcon(id)
    })

    const input = el.querySelector<HTMLInputElement>('.desktop-icon__input')
    if (input) {
      const commit = () => this.commitRename(id, input.value)
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          this.renamingId = null
          this.renderIcons()
          this.select(id)
        }
      })
      input.addEventListener('blur', () => commit())
      input.focus()
      input.select()
    }
  }

  private bind(): void {
    this.iconsHost.addEventListener('dblclick', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('.desktop-icon')
      if (!el || (e.target as HTMLElement).closest('.desktop-icon__input')) return
      this.openIcon(el.dataset.id!)
    })

    this.root.addEventListener('contextmenu', (e) => {
      const me = e as MouseEvent
      if ((me.target as HTMLElement).closest('.win, .start-menu, .menu-popup')) return
      me.preventDefault()

      const iconEl = (me.target as HTMLElement).closest<HTMLElement>('.desktop-icon')
      if (iconEl) {
        const iconId = iconEl.dataset.id!
        if (!this.selectedIds.has(iconId)) {
          this.selectedIds.clear()
          this.selectedIds.add(iconId)
          this.selectionAnchor = iconId
          this.markIconSelection()
        }
        showMenu(this.selectedIds.size > 1 ? this.selectionIconMenu() : this.iconMenu(iconId), { x: me.clientX, y: me.clientY })
        return
      }
      if ((me.target as HTMLElement).closest('.taskbar')) {
        showMenu(this.taskbarMenu(), { x: me.clientX, y: me.clientY, alignBottom: true })
        return
      }
      this.deselect()
      showMenu(this.desktopMenu(), { x: me.clientX, y: me.clientY })
    })

    this.root.querySelector('#start-logoff')!.addEventListener('mouseup', () => {
      this.closeStart()
      void this.shutdown('logoff')
    })

    this.root.querySelector('#start-shutdown')!.addEventListener('mouseup', () => {
      this.closeStart()
      void this.shutdown('shutdown')
    })

    this.startBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation()
      this.toggleStart()
    })

    this.root.querySelector('.taskbar__quicklaunch')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-ql]')
      if (!btn) return
      playClick()
      switch (btn.dataset.ql) {
        case 'desktop': windowManager.minimizeAll(); break
        case 'ie': this.launchIE(); break
        case 'outlook': launchByName('Outlook Express'); break
        case 'wmp': launchByName('Windows Media Player'); break
      }
    })

    document.addEventListener('mousedown', (e) => {
      const t = e.target as HTMLElement
      if (t.closest('.start-menu, .taskbar__start, .menu-popup, .desktop-icon__input, .desktop__icons')) return
      if (this.renamingId) {
        const input = this.iconsHost.querySelector<HTMLInputElement>('.desktop-icon__input')
        if (input && !t.closest('.desktop-icon__input')) {
          this.commitRename(this.renamingId, input.value)
        }
      }
      this.deselect()
      this.closeStart()
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.startOpen) this.closeStart()
      if (this.renamingId) return
      if (e.key === 'F2' && this.selectedIds.size === 1) {
        e.preventDefault()
        void this.startRename([...this.selectedIds][0]!)
      }
      if (e.key === 'Delete' && this.selectedIds.size > 0) {
        e.preventDefault()
        this.deleteSelectedIcons()
      }
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault()
        this.selectAllIcons()
      }
      if (e.ctrlKey && e.key === 'c' && this.selectedIds.size > 0) {
        e.preventDefault()
        this.copySelectedIcons()
      }
      if (e.ctrlKey && e.key === 'x' && this.canModifySelection()) {
        e.preventDefault()
        this.cutSelectedIcons()
      }
      if (e.ctrlKey && e.key === 'v' && canPaste()) {
        e.preventDefault()
        this.pasteToDesktop()
      }
      if (e.altKey && e.key === 'F4') {
        e.preventDefault()
        const activeId = windowManager.getActiveId()
        if (activeId) windowManager.close(activeId)
      }
      if (e.key === 'F5') {
        e.preventDefault()
        this.icons = loadDesktopIcons()
        this.renderIcons()
        applyWallpaper()
      }
    })
  }

  private persistIcons(): void {
    saveDesktopIcons(this.icons)
  }

  private select(id: string): void {
    this.selectedIds.clear()
    this.selectedIds.add(id)
    this.selectionAnchor = id
    this.renderIcons()
  }

  private deselect(): void {
    if (!this.selectedIds.size) return
    this.selectedIds.clear()
    this.selectionAnchor = null
    this.markIconSelection()
  }

  private selectedUserLabels(): string[] {
    return this.icons.filter((item) => this.selectedIds.has(item.id) && !item.system).map((item) => item.label)
  }

  private canModifySelection(): boolean {
    return this.selectedUserLabels().length > 0
  }

  private canRenameSelection(): boolean {
    if (this.selectedIds.size !== 1) return false
    const item = this.getIcon([...this.selectedIds][0]!)
    return !!item && !item.system
  }

  private copySelectedIcons(): void {
    const labels = this.selectedUserLabels()
    if (!labels.length) return
    copyItems(PATH_DESKTOP, labels)
  }

  private cutSelectedIcons(): void {
    const labels = this.selectedUserLabels()
    if (!labels.length) return
    cutItems(PATH_DESKTOP, labels)
  }

  private deleteSelectedIcons(): void {
    const ids = [...this.selectedIds].filter((iconId) => {
      const item = this.getIcon(iconId)
      return item && !item.system
    })
    if (!ids.length) return
    for (const iconId of ids) {
      const item = this.getIcon(iconId)
      if (!item) continue
      removeDesktopNode(item.label)
    }
    this.icons = this.icons.filter((iconItem) => !ids.includes(iconItem.id))
    this.selectedIds.clear()
    this.selectionAnchor = null
    this.persistIcons()
    this.renderIcons()
  }

  private selectAllIcons(): void {
    this.selectedIds.clear()
    for (const item of this.icons) this.selectedIds.add(item.id)
    this.selectionAnchor = this.sortedIconIds()[0] ?? null
    this.renderIcons()
  }

  private getIcon(id: string): DesktopIcon | undefined {
    return this.icons.find((item) => item.id === id)
  }

  private toggleStart(): void {
    this.startOpen ? this.closeStart() : this.openStart()
  }

  private openStart(): void {
    this.startOpen = true
    this.startMenu.classList.add('open')
    this.startBtn.classList.add('active')
  }

  private closeStart(): void {
    this.startOpen = false
    this.startMenu.classList.remove('open')
    this.startBtn.classList.remove('active')
    this.startItemsEl.querySelectorAll('.hot').forEach((n) => n.classList.remove('hot'))
    closeAllMenus()
  }

  private tick(): void {
    const now = new Date()
    this.clockEl.textContent = formatClock(now)
    this.clockEl.title = now.toLocaleDateString('ru-RU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  private renderTasks(): void {
    const wins = windowManager.getWindows()
    const activeId = windowManager.getActiveId()

    this.tasksEl.innerHTML = wins.map((w) => {
      const active = w.id === activeId && !w.minimized
      return `<button class="taskbar__task${active ? ' taskbar__task--active' : ''}" data-win="${w.id}" title="${escapeHtml(w.options.title)}" type="button">
        ${w.options.icon ? icon(w.options.icon, 16, 'taskbar__task-icon') : ''}
        <span class="taskbar__task-label">${escapeHtml(w.options.title)}</span>
      </button>`
    }).join('')

    this.tasksEl.querySelectorAll<HTMLElement>('.taskbar__task').forEach((btn) => {
      const id = btn.dataset.win!
      btn.addEventListener('click', () => {
        playClick()
        const win = windowManager.getWindows().find((w) => w.id === id)
        if (!win) return
        if (win.minimized) windowManager.restore(id)
        else if (windowManager.getActiveId() === id) windowManager.minimize(id)
        else windowManager.focus(id)
      })
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const me = e as MouseEvent
        showMenu([
          { label: '&Восстановить', action: () => windowManager.restore(id) },
          { label: 'Пере&местить', action: () => windowManager.startKeyboardMove(id) },
          { label: '&Размер', action: () => windowManager.startKeyboardResize(id) },
          { label: 'Сверн&уть', action: () => windowManager.minimize(id) },
          { label: 'Развер&нуть', action: () => windowManager.toggleMaximize(id) },
          { separator: true },
          { label: '&Закрыть', shortcut: 'Alt+F4', bold: true, action: () => windowManager.close(id) },
        ], { x: me.clientX, y: me.clientY, alignBottom: true })
      })
    })
  }

  private openIcon(id: string): void {
    const item = this.getIcon(id)
    if (!item) return

    if (item.kind === 'shortcut' && item.target) {
      this.openShortcutTarget(item.target)
      return
    }

    if (item.kind === 'folder' && item.fsPath) {
      openExplorer(item.fsPath)
      return
    }

    if (item.kind === 'file' || item.label.includes('.')) {
      const fsPath = item.fsPath ?? desktopFsPath(item.label)
      if (openFsPath(fsPath)) return
    }

    switch (id) {
      case 'my-computer': openExplorer(PATH_MY_COMPUTER); break
      case 'my-documents': openExplorer(PATH_MY_DOCUMENTS); break
      case 'network': openExplorer(PATH_NETWORK); break
      case 'recycle-bin':
        if (isRecycleEmpty()) showMessage('Корзина пуста.', 'Корзина', 'info')
        else {
          const recycleItems = getRecycleItems()
          const list = recycleItems.map((item) => `• ${item.name} (${item.originalPath})`).join('\n')
          void (async () => {
            const result = await showMessage(
              `Корзина содержит ${recycleItems.length} объект(ов):\n\n${list}\n\nВосстановить или очистить?`,
              'Корзина',
              'question',
              'yesnocancel',
            )
            if (result === 'yes') {
              const restored = restoreFromRecycle(0)
              if (restored) {
                const parent = findNode(restored.originalPath)
                if (parent) {
                  if (!parent.children) parent.children = []
                  parent.children.push(restored.node)
                }
                this.icons = loadDesktopIcons()
                this.renderIcons()
                void showMessage(`Восстановлен: ${restored.name}`, 'Корзина', 'info')
              }
            } else if (result === 'no') {
              emptyRecycleBin()
              void showMessage('Корзина очищена.', 'Корзина', 'info')
            }
          })()
        }
        break
      case 'ie': this.launchIE(); break
      case 'telegram': openTelegram(); break
    }
  }

  private openShortcutTarget(target: string): void {
    if (target.startsWith('app:')) {
      const app = target.slice(4)
      if (app === 'ie') this.launchIE()
      else if (app === 'explorer') openExplorer()
      else if (app === 'telegram') openTelegram()
      else launchByName(app)
      return
    }
    if (target.startsWith('path:')) {
      openExplorer(target.slice(5))
    }
  }

  private launchIE(): void {
    openInternetExplorer()
  }

  private sortDesktopIcons(key: 'name' | 'size' | 'kind' | 'modified'): void {
    this.icons.sort((a, b) => {
      if (key === 'name') return a.label.localeCompare(b.label, 'ru')
      if (key === 'kind') return a.kind.localeCompare(b.kind, 'ru')
      return a.y - b.y || a.x - b.x
    })
    alignIconsToGrid(this.icons)
    this.persistIcons()
    this.renderIcons()
  }

  private createDesktopFile(ext: '.txt' | '.bmp' | '.doc'): void {
    const bases = { '.txt': 'Новый текстовый документ', '.bmp': 'Новый точечный рисунок', '.doc': 'Новый документ Microsoft Word' }
    const iconsMap = { '.txt': 'icon-file-text', '.bmp': 'icon-file-jpg', '.doc': 'icon-file-doc' }
    const node = addTextFile(PATH_DESKTOP, bases[ext], ext)
    if (!node) return
    const pos = findFreeCell(this.icons)
    this.icons.push({
      id: newDesktopId(),
      label: node.name,
      icon: iconsMap[ext],
      x: pos.x,
      y: pos.y,
      kind: 'file',
      fsPath: desktopFsPath(node.name),
    })
    this.persistIcons()
    this.select(this.icons[this.icons.length - 1]!.id)
    void this.startRename(this.icons[this.icons.length - 1]!.id)
  }

  private async shutdown(kind: 'logoff' | 'shutdown'): Promise<void> {
    const result = await showMessage(
      kind === 'logoff' ? 'Вы действительно хотите выйти из системы?' : 'Завершить работу Windows?',
      kind === 'logoff' ? 'Выход из Windows' : 'Выключить компьютер',
      'question',
      kind === 'logoff' ? 'yesno' : 'okcancel',
    )
    if (result !== 'yes' && result !== 'ok') return
    const overlay = document.createElement('div')
    overlay.className = 'shutdown-overlay'
    overlay.textContent = kind === 'logoff' ? 'Выход из системы...' : 'Windows завершает работу...'
    document.body.appendChild(overlay)
    window.setTimeout(() => window.location.reload(), 1800)
  }

  private undoRename(): void {
    if (!this.renameUndo) return
    const item = this.getIcon(this.renameUndo.id)
    if (!item || item.system) return
    void this.commitRename(this.renameUndo.id, this.renameUndo.label)
    this.renameUndo = null
  }

  private pasteToDesktop(): void {
    consumePaste(PATH_DESKTOP, (from, names, cut) => {
      const before = new Set((findNode(PATH_DESKTOP)?.children ?? []).map((child) => child.name))
      const ok = copyChildren(from, names, PATH_DESKTOP, cut)
      if (ok) {
        if (cut && from === PATH_DESKTOP) {
          for (const name of names) {
            this.icons = this.icons.filter((item) => item.system || item.label !== name)
          }
          this.persistIcons()
        }
        for (const child of findNode(PATH_DESKTOP)?.children ?? []) {
          if (before.has(child.name)) continue
          addUserDesktopIcon(
            child.name,
            child.type === 'folder' ? 'folder' : 'file',
            child.icon ?? (child.type === 'folder' ? 'icon-folder' : 'icon-file'),
            child.shortcutTarget ? { target: child.shortcutTarget } : undefined,
          )
        }
        this.icons = loadDesktopIcons()
        this.renderIcons()
      }
      return ok
    })
  }

  private pasteShortcutToDesktop(): void {
    void this.createShortcut()
  }

  private createFolder(): void {
    const label = uniqueDesktopName(this.icons, 'Новая папка')
    addDesktopFolderNode(label)
    const pos = findFreeCell(this.icons)
    const item: DesktopIcon = {
      id: newDesktopId(),
      label,
      icon: 'icon-folder',
      x: pos.x,
      y: pos.y,
      kind: 'folder',
      fsPath: desktopFsPath(label),
    }
    this.icons.push(item)
    this.persistIcons()
    this.select(item.id)
    void this.startRename(item.id)
  }

  private async createShortcut(): Promise<void> {
    const input = await showPrompt(
      'Укажите расположение элемента, для которого требуется создать ярлык:',
      'Создание ярлыка',
    )
    if (!input) return

    const resolved = this.resolveShortcutInput(input)
    if (!resolved) {
      void showMessage('Не удается найти указанный файл.', 'Создание ярлыка', 'error')
      return
    }

    const label = uniqueDesktopName(this.icons, resolved.label, '.lnk')
    addDesktopShortcutNode(label, resolved.target, resolved.icon)
    const pos = findFreeCell(this.icons)
    const item: DesktopIcon = {
      id: newDesktopId(),
      label,
      icon: resolved.icon,
      x: pos.x,
      y: pos.y,
      kind: 'shortcut',
      target: resolved.target,
    }
    this.icons.push(item)
    this.persistIcons()
    this.select(item.id)
  }

  private resolveShortcutInput(input: string): { label: string; target: string; icon: string } | null {
    const text = input.trim()
    if (!text) return null
    const lower = text.toLowerCase()
    if (lower.includes('iexplore') || lower.includes('internet explorer')) {
      return { label: 'Internet Explorer', target: 'app:ie', icon: 'icon-ie' }
    }
    if (lower.includes('explorer.exe') || lower === 'проводник' || lower.includes('проводник windows')) {
      return { label: 'Проводник Windows', target: 'app:explorer', icon: 'icon-folder-open' }
    }
    if (lower.includes('мои документы')) {
      return { label: 'Мои документы', target: `path:${PATH_MY_DOCUMENTS}`, icon: 'icon-documents' }
    }
    if (lower.includes('мой компьютер')) {
      return { label: 'Мой компьютер', target: `path:${PATH_MY_COMPUTER}`, icon: 'icon-computer' }
    }
    if (lower.includes('сетевое окружение')) {
      return { label: 'Сетевое окружение', target: `path:${PATH_NETWORK}`, icon: 'icon-network' }
    }
    const base = text.split(/[\\/]/).pop()?.replace(/\.lnk$/i, '') ?? text
    return { label: base, target: `path:${text}`, icon: shortcutIconForTarget(`path:${text}`) }
  }

  private async startRename(id: string): Promise<void> {
    const item = this.getIcon(id)
    if (!item || item.system) return
    this.renamingId = id
    this.renderIcons()
  }

  private commitRename(id: string, raw: string): void {
    const item = this.getIcon(id)
    if (!item || item.system) {
      this.renamingId = null
      this.renderIcons()
      return
    }

    const next = raw.trim()
    this.renamingId = null
    if (!next || next === item.label) {
      this.renderIcons()
      this.select(id)
      return
    }

    const duplicate = this.icons.some(
      (iconItem) => iconItem.id !== id && iconItem.label.toLowerCase() === next.toLowerCase(),
    )
    if (duplicate) {
      void showMessage('Объект с таким именем уже существует.', 'Переименование', 'warning')
      this.renderIcons()
      this.select(id)
      return
    }

    const oldLabel = item.label
    this.renameUndo = { id, label: oldLabel }
    if (item.kind === 'folder') {
      renameDesktopNode(oldLabel, next)
      item.fsPath = desktopFsPath(next)
    } else if (item.kind === 'file') {
      renameDesktopNode(oldLabel, next)
      item.fsPath = desktopFsPath(next)
    } else if (item.kind === 'shortcut') {
      renameDesktopNode(oldLabel, next.endsWith('.lnk') ? next : `${next}.lnk`)
      item.label = next.endsWith('.lnk') ? next : `${next}.lnk`
      this.persistIcons()
      this.renderIcons()
      this.select(id)
      return
    }

    item.label = next
    this.renameUndo = null
    this.persistIcons()
    this.renderIcons()
    this.select(id)
  }

  private deleteIcon(id: string): void {
    this.selectedIds.clear()
    this.selectedIds.add(id)
    this.deleteSelectedIcons()
  }

  private alignToGrid(): void {
    alignIconsToGrid(this.icons)
    this.persistIcons()
    this.renderIcons()
  }

  private startMenuItems(): MenuItem[] {
    return [
      { label: 'Windows Catalog', icon: 'icon-catalog', action: () => this.launchIE() },
      { label: 'Windows Update', icon: 'icon-winupdate', action: () => this.launchIE() },
      { separator: true },
      {
        label: '&Программы', icon: 'icon-programs', items: [
          {
            label: 'Стандартные', icon: 'icon-programs', items: [
              { label: 'Служебные', icon: 'icon-programs', items: [
                { label: 'Дефрагментация диска', icon: 'icon-drive', action: () => launchByName('Дефрагментация диска') },
                { label: 'Очистка диска', icon: 'icon-drive', action: () => launchByName('Очистка диска') },
                { label: 'Сведения о системе', icon: 'icon-computer', action: () => showAbout() },
              ] },
              { label: 'Связь', icon: 'icon-network', items: [
                { label: 'Мастер новых подключений', icon: 'icon-network', action: () => launchByName('Мастер новых подключений') },
                { label: 'Сетевые подключения', icon: 'icon-network', action: () => launchByName('Сетевые подключения') },
              ] },
              { separator: true },
              { label: 'Блокнот', icon: 'icon-notepad', action: () => launchByName('Блокнот') },
              { label: 'Калькулятор', icon: 'icon-file-exe', action: () => launchByName('Калькулятор') },
              { label: 'Командная строка', icon: 'icon-file-exe', action: () => launchByName('Командная строка') },
              { label: 'Paint', icon: 'icon-file-jpg', action: () => launchByName('Paint') },
              { label: 'Media Player Classic', icon: 'icon-mediaplayer', action: () => openMediaPlayer() },
              { label: 'Проводник Windows', icon: 'icon-folder-open', action: () => openExplorer() },
              { label: 'WordPad', icon: 'icon-file-doc', action: () => launchByName('WordPad') },
            ],
          },
          { label: 'Автозагрузка', icon: 'icon-programs', items: [{ label: '(пусто)', disabled: true }] },
          {
            label: 'Игры', icon: 'icon-programs', items: [
              { label: 'Косынка', icon: 'icon-file-exe', action: () => launchByName('Косынка') },
              { label: 'Сапёр', icon: 'icon-file-exe', action: () => launchByName('Сапёр') },
              { label: 'Пинбол', icon: 'icon-file-exe', action: () => launchByName('Пинбол') },
              { label: 'Паук', icon: 'icon-file-exe', action: () => launchByName('Паук') },
            ],
          },
          { separator: true },
          { label: 'Адресная книга', icon: 'icon-catalog', action: () => launchByName('Адресная книга') },
          { label: 'Internet Explorer', icon: 'icon-ie', action: () => this.launchIE() },
          { label: 'Outlook Express', icon: 'icon-outlook', action: () => launchByName('Outlook Express') },
          { label: 'Windows Media Player', icon: 'icon-mediaplayer', action: () => launchByName('Windows Media Player') },
          { label: 'Windows Messenger', icon: 'icon-messenger', action: () => launchByName('Windows Messenger') },
          { label: 'Проводник Windows', icon: 'icon-folder-open', action: () => openExplorer() },
        ],
      },
      {
        label: 'Док&ументы', icon: 'icon-documents', items: [
          { label: 'Мои документы', icon: 'icon-documents', action: () => openExplorer(PATH_MY_DOCUMENTS) },
          { label: 'Мои рисунки', icon: 'icon-pictures', action: () => openExplorer(PATH_MY_PICTURES) },
          { label: 'Моя музыка', icon: 'icon-music', action: () => openExplorer(PATH_MY_MUSIC) },
          { separator: true },
          { label: 'report.doc', icon: 'icon-file-doc', action: () => launchByName('report.doc') },
          { label: 'notes.txt', icon: 'icon-file-text', action: () => launchByName('notes.txt') },
        ],
      },
      {
        label: '&Настройка', icon: 'icon-settings', items: [
          { label: 'Панель управления', icon: 'icon-controlpanel', action: () => openExplorer(PATH_CONTROL_PANEL) },
          { label: 'Сетевые подключения', icon: 'icon-network', action: () => launchByName('Сетевые подключения') },
          { label: 'Принтеры и факсы', icon: 'icon-printer', action: () => launchByName('Принтеры и факсы') },
          { separator: true },
          { label: 'Панель задач и меню «Пуск»', icon: 'icon-settings', action: () => launchByName('Свойства панели задач') },
        ],
      },
      {
        label: 'Найт&и', icon: 'icon-find', items: [
          { label: 'Файлы и папки...', icon: 'icon-find', action: () => openSearchDialog() },
          { label: 'В Интернете...', icon: 'icon-ie', action: () => this.launchIE() },
          { label: 'Людей...', icon: 'icon-catalog', action: () => launchByName('Адресная книга') },
        ],
      },
      { label: 'Спр&авка и поддержка', icon: 'icon-help', action: () => launchByName('Центр справки и поддержки') },
      { label: '&Выполнить...', icon: 'icon-run', action: () => void showRunDialog() },
    ]
  }

  private desktopMenu(): MenuItem[] {
    return [
      {
        label: '&Упорядочить значки', items: [
          { label: '&Имя', action: () => this.sortDesktopIcons('name') },
          { label: '&Размер', action: () => this.sortDesktopIcons('size') },
          { label: '&Тип', action: () => this.sortDesktopIcons('kind') },
          { label: '&Изменён', action: () => this.sortDesktopIcons('modified') },
          { separator: true },
          { label: '&Автоматически', action: () => this.alignToGrid() },
          { label: '&Выровнять по сетке', action: () => this.alignToGrid() },
          { separator: true },
          {
            label: 'Отображать значки рабочего стола',
            checked: this.iconsVisible,
            action: () => { this.iconsVisible = !this.iconsVisible; this.renderIcons() },
          },
        ],
      },
      { label: 'Об&новить', action: () => { this.icons = loadDesktopIcons(); this.renderIcons() } },
      { separator: true },
      { label: 'Вст&авить', disabled: !canPaste(), action: () => this.pasteToDesktop() },
      { label: 'Вставить &ярлык', disabled: !canPaste(), action: () => this.pasteShortcutToDesktop() },
      {
        label: 'Отменить &переименование',
        shortcut: 'Ctrl+Z',
        disabled: !this.renameUndo,
        action: () => this.undoRename(),
      },
      { separator: true },
      {
        label: '&Создать', items: [
          { label: '&Папку', icon: 'icon-folder', action: () => this.createFolder() },
          { label: '&Ярлык', icon: 'icon-file-exe', action: () => void this.createShortcut() },
          { separator: true },
          { label: 'Текстовый документ', icon: 'icon-file-text', action: () => this.createDesktopFile('.txt') },
          { label: 'Точечный рисунок', icon: 'icon-file-jpg', action: () => this.createDesktopFile('.bmp') },
          { label: 'Документ Microsoft Word', icon: 'icon-file-doc', action: () => this.createDesktopFile('.doc') },
        ],
      },
      { separator: true },
      { label: 'С&войства', action: () => showProperties({ name: 'Экран', type: 'display' }) },
    ]
  }

  private iconMenu(id: string): MenuItem[] {
    const item = this.getIcon(id)
    const label = item?.label ?? ''
    const userItem = item && !item.system
    if (id === 'recycle-bin') {
      return [
        { label: '&Открыть', bold: true, action: () => this.openIcon(id) },
        { separator: true },
        { label: '&Очистить корзину', disabled: isRecycleEmpty(), action: () => { emptyRecycleBin(); void showMessage('Корзина очищена.', 'Корзина', 'info') } },
        { separator: true },
        { label: 'С&войства', action: () => showProperties({ name: label, type: 'folder' }) },
      ]
    }
    return [
      { label: '&Открыть', bold: true, action: () => this.openIcon(id) },
      { label: '&Проводник', action: () => openExplorer(item?.fsPath ?? (item?.id === 'my-computer' ? PATH_MY_COMPUTER : undefined)) },
      { label: 'На&йти...', action: () => openSearchDialog() },
      { separator: true },
      { label: 'В&ырезать', disabled: !userItem, action: () => this.cutSelectedIcons() },
      { label: '&Копировать', action: () => this.copySelectedIcons() },
      { separator: true },
      { label: 'Создать &ярлык', disabled: id === 'recycle-bin', action: () => void this.createShortcutFromIcon(id) },
      { label: '&Удалить', disabled: !userItem, action: () => this.deleteIcon(id) },
      { label: 'Переи&меновать', disabled: !userItem, action: () => void this.startRename(id) },
      { separator: true },
      { label: 'С&войства', action: () => showProperties({ name: label, type: item?.kind === 'folder' ? 'folder' : 'file' }) },
    ]
  }

  private selectionIconMenu(): MenuItem[] {
    const modifiable = this.canModifySelection()
    const first = [...this.selectedIds][0]
    return [
      { label: '&Открыть', bold: true, disabled: this.selectedIds.size !== 1 || !first, action: () => first && this.openIcon(first) },
      { separator: true },
      { label: 'В&ырезать', disabled: !modifiable, action: () => this.cutSelectedIcons() },
      { label: '&Копировать', action: () => this.copySelectedIcons() },
      { separator: true },
      { label: '&Удалить', disabled: !modifiable, action: () => this.deleteSelectedIcons() },
      { label: 'Переи&меновать', disabled: !this.canRenameSelection(), action: () => first && void this.startRename(first) },
    ]
  }

  private async createShortcutFromIcon(id: string): Promise<void> {
    const item = this.getIcon(id)
    if (!item) return
    let target = ''
    let shortcutLabel = item.label
    let shortcutIcon = item.icon

    if (item.kind === 'folder' && item.fsPath) {
      target = `path:${item.fsPath}`
      shortcutIcon = 'icon-file-exe'
    } else if (item.kind === 'shortcut' && item.target) {
      target = item.target
      shortcutIcon = item.icon
      shortcutLabel = item.label.replace(/\.lnk$/i, '')
    } else if (item.id === 'ie') {
      target = 'app:ie'
      shortcutIcon = 'icon-ie'
    } else if (item.id === 'my-documents') {
      target = `path:${PATH_MY_DOCUMENTS}`
      shortcutIcon = 'icon-documents'
    } else if (item.id === 'my-computer') {
      target = `path:${PATH_MY_COMPUTER}`
      shortcutIcon = 'icon-computer'
    } else if (item.id === 'network') {
      target = `path:${PATH_NETWORK}`
      shortcutIcon = 'icon-network'
    } else {
      return
    }

    const label = uniqueDesktopName(this.icons, shortcutLabel, '.lnk')
    addDesktopShortcutNode(label, target, shortcutIcon)
    const pos = findFreeCell(this.icons)
    const shortcut: DesktopIcon = {
      id: newDesktopId(),
      label,
      icon: shortcutIcon,
      x: pos.x,
      y: pos.y,
      kind: 'shortcut',
      target,
    }
    this.icons.push(shortcut)
    this.persistIcons()
    this.select(shortcut.id)
  }

  private taskbarMenu(): MenuItem[] {
    return [
      {
        label: 'Панели &инструментов', items: [
          { label: 'Адрес', action: () => showMessage('Панель адреса на панели задач (имитация).', 'Панель задач', 'info') },
          { label: 'Ссылки', action: () => showMessage('Панель ссылок (имитация).', 'Панель задач', 'info') },
          { label: 'Рабочий стол', action: () => windowManager.minimizeAll() },
          {
            label: 'Быстрый запуск',
            checked: this.qlVisible,
            action: () => {
              this.qlVisible = !this.qlVisible
              this.root.querySelector<HTMLElement>('.taskbar__quicklaunch')!.style.display = this.qlVisible ? '' : 'none'
            },
          },
        ],
      },
      { separator: true },
      { label: 'Окна &каскадом', action: () => windowManager.cascadeWindows() },
      { label: 'Окна с&верху вниз', action: () => windowManager.tileWindowsHorizontal() },
      { label: 'Окна с&лева направо', action: () => windowManager.tileWindowsVertical() },
      { label: 'Показать &рабочий стол', action: () => windowManager.minimizeAll() },
      { separator: true },
      { label: '&Диспетчер задач', action: () => openTaskManager() },
      { separator: true },
      {
        label: '&Закрепить панель задач',
        checked: this.taskbarLocked,
        action: () => { this.taskbarLocked = !this.taskbarLocked },
      },
      { label: 'С&войства', action: () => showProperties({ name: 'Панель задач', type: 'display' }) },
    ]
  }
}
