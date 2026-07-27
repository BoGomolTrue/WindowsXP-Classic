import { DESKTOP_ICONS, USER_NAME } from '../data/icons'
import { accel, escapeHtml, formatClock, icon } from '../utils/helpers'
import { windowManager } from '../windows/WindowManager'
import { openExplorer } from '../windows/Explorer'
import { showMessage } from '../dialogs/MessageBox'
import { showProperties } from '../dialogs/PropertiesDialog'
import { showAbout } from '../dialogs/AboutDialog'
import { closeAllMenus, showMenu, showSubmenuFor, type MenuItem } from '../ui/Menu'

const DOCS = 'Мой компьютер\\Локальный диск (C:)\\Documents and Settings\\Пользователь\\Мои документы'

export class Desktop {
  private root: HTMLElement
  private startOpen = false
  private clockEl!: HTMLElement
  private startBtn!: HTMLElement
  private startMenu!: HTMLElement
  private startItemsEl!: HTMLElement
  private tasksEl!: HTMLElement
  private items: MenuItem[] = []

  constructor(container: HTMLElement) {
    this.root = container
    this.render()
    this.items = this.startMenuItems()
    this.renderStartMenu()
    this.bind()
    this.tick()
    setInterval(() => this.tick(), 1000)
    windowManager.setOnChange(() => this.renderTasks())
  }

  /* ───────────────────────── разметка ───────────────────────── */

  private render(): void {
    this.root.className = 'desktop'
    this.root.innerHTML = `
      <div class="desktop__icons">
        ${DESKTOP_ICONS.map((it) => `
          <div class="desktop-icon" data-id="${it.id}" style="left:${it.x}px;top:${it.y}px">
            ${icon(it.icon, 32, 'desktop-icon__img')}
            <span class="desktop-icon__label">${escapeHtml(it.label)}</span>
          </div>`).join('')}
      </div>

      <div class="start-menu" id="start-menu">
        <div class="start-menu__banner">
          <div class="start-menu__banner-text"><span>Windows</span><b>XP</b></div>
        </div>
        <div class="start-menu__items" id="start-items"></div>
      </div>

      <div class="taskbar">
        <button class="taskbar__start" id="start-btn" type="button">
          ${icon('icon-start-flag', 16, 'taskbar__start-icon')}
          <span>Пуск</span>
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
    this.startItemsEl = this.root.querySelector('#start-items')!
    this.tasksEl = this.root.querySelector('#tasks')!
  }

  private renderStartMenu(): void {
    this.startItemsEl.innerHTML = this.items.map((item, i) => {
      if (item.separator) return '<div class="start-menu__sep"></div>'
      const cls = 'start-menu__item' + (item.items ? ' start-menu__item--sub' : '')
      return `<div class="${cls}" data-index="${i}">${icon(item.icon ?? 'icon-file', 32)}<span>${accel(item.label ?? '')}</span></div>`
    }).join('')

    this.startItemsEl.querySelectorAll<HTMLElement>('.start-menu__item').forEach((el) => {
      const item = this.items[Number(el.dataset.index)]

      el.addEventListener('mouseenter', () => {
        closeAllMenus()
        this.startItemsEl.querySelectorAll('.hot').forEach((n) => n.classList.remove('hot'))
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

  /* ───────────────────────── события ───────────────────────── */

  private bind(): void {
    const iconsHost = this.root.querySelector('.desktop__icons')!

    iconsHost.addEventListener('mousedown', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('.desktop-icon')
      if (!el) return
      e.stopPropagation()
      this.select(el.dataset.id!)
    })

    iconsHost.addEventListener('dblclick', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('.desktop-icon')
      if (!el) return
      this.openIcon(el.dataset.id!)
    })

    this.root.addEventListener('contextmenu', (e) => {
      const me = e as MouseEvent
      if ((me.target as HTMLElement).closest('.win, .start-menu, .menu-popup')) return
      me.preventDefault()

      const iconEl = (me.target as HTMLElement).closest<HTMLElement>('.desktop-icon')
      if (iconEl) {
        this.select(iconEl.dataset.id!)
        showMenu(this.iconMenu(iconEl.dataset.id!), { x: me.clientX, y: me.clientY })
        return
      }
      if ((me.target as HTMLElement).closest('.taskbar')) {
        showMenu(this.taskbarMenu(), { x: me.clientX, y: me.clientY, alignBottom: true })
        return
      }
      this.deselect()
      showMenu(this.desktopMenu(), { x: me.clientX, y: me.clientY })
    })

    this.startBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation()
      this.toggleStart()
    })

    this.root.querySelector('.taskbar__quicklaunch')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-ql]')
      if (!btn) return
      switch (btn.dataset.ql) {
        case 'desktop': windowManager.minimizeAll(); break
        case 'ie': this.launchIE(); break
        case 'outlook': this.stub('Outlook Express'); break
        case 'wmp': this.stub('Windows Media Player'); break
      }
    })

    document.addEventListener('mousedown', (e) => {
      const t = e.target as HTMLElement
      if (t.closest('.start-menu, .taskbar__start, .menu-popup')) return
      this.deselect()
      this.closeStart()
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.startOpen) this.closeStart()
    })
  }

  private select(id: string): void {
    this.root.querySelectorAll<HTMLElement>('.desktop-icon').forEach((el) => {
      el.classList.toggle('selected', el.dataset.id === id)
    })
  }

  private deselect(): void {
    this.root.querySelectorAll('.desktop-icon').forEach((el) => el.classList.remove('selected'))
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
          { label: 'Пере&местить', disabled: true },
          { label: '&Размер', disabled: true },
          { label: 'Сверн&уть', action: () => windowManager.minimize(id) },
          { label: 'Развер&нуть', action: () => windowManager.toggleMaximize(id) },
          { separator: true },
          { label: '&Закрыть', shortcut: 'Alt+F4', bold: true, action: () => windowManager.close(id) },
        ], { x: me.clientX, y: me.clientY, alignBottom: true })
      })
    })
  }

  /* ───────────────────────── действия ───────────────────────── */

  private openIcon(id: string): void {
    switch (id) {
      case 'my-computer': openExplorer(); break
      case 'my-documents': openExplorer(DOCS); break
      case 'network': openExplorer('Мой компьютер'); break
      case 'recycle-bin': showMessage('Корзина пуста.', 'Корзина', 'info'); break
      case 'ie': this.launchIE(); break
    }
  }

  private launchIE(): void {
    showMessage(
      'Не удается отобразить страницу\n\nВозможно, возникли неполадки при подключении, либо адрес указан неверно.',
      'Internet Explorer',
      'error',
    )
  }

  private stub(name: string): void {
    showMessage(`Не удается найти файл «${name}».\n\nПроверьте правильность имени и повторите попытку.`, name, 'error')
  }

  /* ───────────────────────── меню ───────────────────────── */

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
                { label: 'Дефрагментация диска', icon: 'icon-drive', action: () => this.stub('Дефрагментация диска') },
                { label: 'Очистка диска', icon: 'icon-drive', action: () => this.stub('Очистка диска') },
                { label: 'Сведения о системе', icon: 'icon-computer', action: () => showAbout() },
              ] },
              { label: 'Связь', icon: 'icon-network', items: [
                { label: 'Мастер новых подключений', icon: 'icon-network', action: () => this.stub('Мастер новых подключений') },
                { label: 'Сетевые подключения', icon: 'icon-network', action: () => this.stub('Сетевые подключения') },
              ] },
              { separator: true },
              { label: 'Блокнот', icon: 'icon-notepad', action: () => this.stub('Блокнот') },
              { label: 'Калькулятор', icon: 'icon-file-exe', action: () => this.stub('Калькулятор') },
              { label: 'Командная строка', icon: 'icon-file-exe', action: () => this.stub('Командная строка') },
              { label: 'Paint', icon: 'icon-file-jpg', action: () => this.stub('Paint') },
              { label: 'Проводник Windows', icon: 'icon-folder-open', action: () => openExplorer() },
              { label: 'WordPad', icon: 'icon-file-doc', action: () => this.stub('WordPad') },
            ],
          },
          { label: 'Автозагрузка', icon: 'icon-programs', items: [{ label: '(пусто)', disabled: true }] },
          {
            label: 'Игры', icon: 'icon-programs', items: [
              { label: 'Косынка', icon: 'icon-file-exe', action: () => this.stub('Косынка') },
              { label: 'Сапёр', icon: 'icon-file-exe', action: () => this.stub('Сапёр') },
              { label: 'Пинбол', icon: 'icon-file-exe', action: () => this.stub('Пинбол') },
              { label: 'Паук', icon: 'icon-file-exe', action: () => this.stub('Паук') },
            ],
          },
          { separator: true },
          { label: 'Адресная книга', icon: 'icon-catalog', action: () => this.stub('Адресная книга') },
          { label: 'Internet Explorer', icon: 'icon-ie', action: () => this.launchIE() },
          { label: 'Outlook Express', icon: 'icon-outlook', action: () => this.stub('Outlook Express') },
          { label: 'Windows Media Player', icon: 'icon-mediaplayer', action: () => this.stub('Windows Media Player') },
          { label: 'Windows Messenger', icon: 'icon-messenger', action: () => this.stub('Windows Messenger') },
          { label: 'Проводник Windows', icon: 'icon-folder-open', action: () => openExplorer() },
        ],
      },
      {
        label: 'Док&ументы', icon: 'icon-documents', items: [
          { label: 'Мои документы', icon: 'icon-documents', action: () => openExplorer(DOCS) },
          { label: 'Мои рисунки', icon: 'icon-pictures', action: () => openExplorer(DOCS + '\\Мои рисунки') },
          { label: 'Моя музыка', icon: 'icon-music', action: () => openExplorer(DOCS + '\\Моя музыка') },
          { separator: true },
          { label: 'report.doc', icon: 'icon-file-doc', action: () => this.stub('report.doc') },
          { label: 'notes.txt', icon: 'icon-file-text', action: () => this.stub('notes.txt') },
        ],
      },
      {
        label: '&Настройка', icon: 'icon-settings', items: [
          { label: 'Панель управления', icon: 'icon-controlpanel', action: () => openExplorer('Мой компьютер\\Панель управления') },
          { label: 'Сетевые подключения', icon: 'icon-network', action: () => this.stub('Сетевые подключения') },
          { label: 'Принтеры и факсы', icon: 'icon-printer', action: () => this.stub('Принтеры и факсы') },
          { separator: true },
          { label: 'Панель задач и меню «Пуск»', icon: 'icon-settings', action: () => this.stub('Свойства панели задач') },
        ],
      },
      {
        label: 'Найт&и', icon: 'icon-find', items: [
          { label: 'Файлы и папки...', icon: 'icon-find', action: () => this.stub('Помощник по поиску') },
          { label: 'В Интернете...', icon: 'icon-ie', action: () => this.launchIE() },
          { label: 'Людей...', icon: 'icon-catalog', action: () => this.stub('Адресная книга') },
        ],
      },
      { label: 'Спр&авка и поддержка', icon: 'icon-help', action: () => this.stub('Центр справки и поддержки') },
      { label: '&Выполнить...', icon: 'icon-run', action: () => this.stub('Запуск программы') },
      { separator: true },
      {
        label: `Вы&ход из системы «${USER_NAME}»...`, icon: 'icon-logoff',
        action: () => showMessage('Вы действительно хотите выйти из системы?', 'Выход из Windows', 'question', 'yesno'),
      },
      {
        label: 'Заверш&ение работы...', icon: 'icon-shutdown',
        action: () => showMessage('Завершение работы Windows...', 'Выключить компьютер', 'question', 'okcancel'),
      },
    ]
  }

  private desktopMenu(): MenuItem[] {
    return [
      {
        label: '&Упорядочить значки', items: [
          { label: '&Имя', action: () => {} },
          { label: '&Размер', action: () => {} },
          { label: '&Тип', action: () => {} },
          { label: '&Изменён', action: () => {} },
          { separator: true },
          { label: '&Автоматически', action: () => {} },
          { label: '&Выровнять по сетке', action: () => {} },
          { separator: true },
          { label: 'Отображать значки рабочего стола', checked: true, action: () => {} },
        ],
      },
      { label: 'Об&новить', action: () => {} },
      { separator: true },
      { label: 'Вст&авить', disabled: true },
      { label: 'Вставить &ярлык', disabled: true },
      { label: 'Отменить &переименование', shortcut: 'Ctrl+Z', disabled: true },
      { separator: true },
      {
        label: '&Создать', items: [
          { label: '&Папку', icon: 'icon-folder', action: () => {} },
          { label: '&Ярлык', icon: 'icon-file-exe', action: () => {} },
          { separator: true },
          { label: 'Текстовый документ', icon: 'icon-file-text', action: () => {} },
          { label: 'Точечный рисунок', icon: 'icon-file-jpg', action: () => {} },
          { label: 'Документ Microsoft Word', icon: 'icon-file-doc', action: () => {} },
        ],
      },
      { separator: true },
      { label: 'С&войства', action: () => showProperties({ name: 'Экран', type: 'display' }) },
    ]
  }

  private iconMenu(id: string): MenuItem[] {
    const label = DESKTOP_ICONS.find((i) => i.id === id)?.label ?? ''
    return [
      { label: '&Открыть', bold: true, action: () => this.openIcon(id) },
      { label: '&Проводник', action: () => openExplorer() },
      { label: 'На&йти...', action: () => this.stub('Помощник по поиску') },
      { separator: true },
      { label: 'Создать &ярлык', disabled: id === 'recycle-bin' },
      { label: '&Удалить', disabled: id !== 'ie' },
      { label: 'Переи&меновать', disabled: id === 'recycle-bin' },
      { separator: true },
      { label: 'С&войства', action: () => showProperties({ name: label, type: 'folder' }) },
    ]
  }

  private taskbarMenu(): MenuItem[] {
    return [
      {
        label: 'Панели &инструментов', items: [
          { label: 'Адрес', action: () => {} },
          { label: 'Ссылки', action: () => {} },
          { label: 'Рабочий стол', action: () => {} },
          { label: 'Быстрый запуск', checked: true, action: () => {} },
        ],
      },
      { separator: true },
      { label: 'Окна &каскадом', action: () => {} },
      { label: 'Окна с&верху вниз', action: () => {} },
      { label: 'Окна с&лева направо', action: () => {} },
      { label: 'Показать &рабочий стол', action: () => windowManager.minimizeAll() },
      { separator: true },
      { label: '&Диспетчер задач', action: () => this.stub('Диспетчер задач Windows') },
      { separator: true },
      { label: '&Закрепить панель задач', checked: true, action: () => {} },
      { label: 'С&войства', action: () => this.stub('Свойства панели задач') },
    ]
  }
}
