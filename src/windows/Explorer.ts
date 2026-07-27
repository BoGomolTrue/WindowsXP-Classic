import {
  FILE_SYSTEM, PATH_MY_COMPUTER, SEP,
  addressOf, findNode, joinPath, kindOf, parentPath, resolve, splitPath,
  type FSNode,
} from '../data/filesystem'
import { escapeAttr, escapeHtml, icon } from '../utils/helpers'
import { windowManager, type WindowMenu } from './WindowManager'
import { showMenu, type MenuItem } from '../ui/Menu'
import { showMessage } from '../dialogs/MessageBox'
import { showProperties } from '../dialogs/PropertiesDialog'
import { showAbout } from '../dialogs/AboutDialog'

type ViewMode = 'details' | 'icons'

interface Column {
  key: 'name' | 'size' | 'kind' | 'modified' | 'total' | 'free'
  title: string
  width?: number
  flex?: boolean
  numeric?: boolean
}

const COLS_FILES: Column[] = [
  { key: 'name', title: 'Имя', flex: true },
  { key: 'size', title: 'Размер', width: 76, numeric: true },
  { key: 'kind', title: 'Тип', width: 148 },
  { key: 'modified', title: 'Изменён', width: 112 },
]

const COLS_DRIVES: Column[] = [
  { key: 'name', title: 'Имя', flex: true },
  { key: 'kind', title: 'Тип', width: 120 },
  { key: 'total', title: 'Полный объём', width: 90, numeric: true },
  { key: 'free', title: 'Свободно', width: 82, numeric: true },
]

export function openExplorer(startPath: string = PATH_MY_COMPUTER): void {
  const root = document.createElement('div')
  root.className = 'explorer'

  let path = findNode(startPath) ? startPath : PATH_MY_COMPUTER
  let node = findNode(path)!
  let view: ViewMode = 'details'
  let paneVisible = true
  let selected: string | null = null

  const history: string[] = [path]
  let historyIndex = 0
  const expanded = new Set<string>()
  expandAncestors(path)

  root.innerHTML = `
    <div class="explorer__rebar">
      <div class="explorer__band">
        <div class="explorer__grip"></div>
        <div class="toolbar" data-role="toolbar"></div>
      </div>
      <div class="explorer__band">
        <div class="explorer__grip"></div>
        <div class="explorer__address">
          <span class="explorer__address-label">Адрес</span>
          <div class="combo" data-role="address">
            <span class="combo__icon" data-role="address-icon"></span>
            <span class="combo__text" data-role="address-text"></span>
            <button class="combo__btn" type="button" data-role="address-drop"></button>
          </div>
          <button class="toolbar__btn" type="button" data-action="go">${icon('tb-go', 16)}Переход</button>
        </div>
      </div>
    </div>
    <div class="explorer__main">
      <div class="explorer__pane" data-role="pane">
        <div class="explorer__pane-title"><span>Папки</span><button class="explorer__pane-close" type="button" data-action="hide-pane" title="Закрыть"></button></div>
        <div class="explorer__tree" data-role="tree"></div>
      </div>
      <div class="explorer__splitter" data-role="splitter"></div>
      <div class="explorer__list" data-role="list"></div>
    </div>
    <div class="statusbar">
      <div class="statusbar__pane statusbar__pane--grow" data-role="status-count"></div>
      <div class="statusbar__pane" style="width:120px" data-role="status-size"></div>
      <div class="statusbar__pane" style="width:170px" data-role="status-zone"></div>
      <div class="statusbar__grip"></div>
    </div>
  `

  const el = <T extends HTMLElement = HTMLElement>(role: string) => root.querySelector<T>(`[data-role="${role}"]`)!
  const toolbarEl = el('toolbar')
  const paneEl = el('pane')
  const splitterEl = el('splitter')
  const treeEl = el('tree')
  const listEl = el('list')

  const winId = windowManager.open({
    title: captionFor(node),
    icon: node.icon ?? 'icon-folder-open',
    width: 760,
    height: 520,
    menu: menuBar,
    content: root,
  })

  /* ───────────────────────── навигация ───────────────────────── */

  function expandAncestors(target: string): void {
    const parts = splitPath(target)
    for (let i = 1; i <= parts.length; i++) expanded.add(joinPath(parts.slice(0, i)))
  }

  function go(target: string, pushHistory = true): void {
    const found = findNode(target)
    if (!found) return
    path = target
    node = found
    selected = null
    expandAncestors(target)
    if (pushHistory) {
      history.splice(historyIndex + 1)
      history.push(target)
      historyIndex = history.length - 1
    }
    windowManager.setTitle(winId, captionFor(node))
    renderAll()
  }

  function back(): void {
    if (historyIndex <= 0) return
    historyIndex--
    go(history[historyIndex], false)
  }

  function forward(): void {
    if (historyIndex >= history.length - 1) return
    historyIndex++
    go(history[historyIndex], false)
  }

  function up(): void {
    const parent = parentPath(path)
    if (parent) go(parent)
  }

  function captionFor(n: FSNode): string {
    return n === FILE_SYSTEM ? 'Рабочий стол' : n.name
  }

  /* ───────────────────────── отрисовка ───────────────────────── */

  function renderAll(): void {
    renderToolbar()
    renderAddress()
    renderTree()
    renderList()
    renderStatus()
    paneEl.style.display = paneVisible ? '' : 'none'
    splitterEl.style.display = paneVisible ? '' : 'none'
  }

  function renderToolbar(): void {
    const canBack = historyIndex > 0
    const canForward = historyIndex < history.length - 1
    const canUp = parentPath(path) !== null

    toolbarEl.innerHTML = `
      <button class="toolbar__btn" type="button" data-action="back" ${canBack ? '' : 'disabled'} title="Назад">
        ${icon('tb-back', 22)}<span>Назад</span><span class="toolbar__arrow"></span>
      </button>
      <button class="toolbar__btn" type="button" data-action="forward" ${canForward ? '' : 'disabled'} title="Вперёд">
        ${icon('tb-forward', 22)}<span class="toolbar__arrow"></span>
      </button>
      <button class="toolbar__btn" type="button" data-action="up" ${canUp ? '' : 'disabled'} title="Вверх">
        ${icon('tb-up', 22)}
      </button>
      <div class="toolbar__sep"></div>
      <button class="toolbar__btn" type="button" data-action="search" title="Поиск">
        ${icon('tb-search', 22)}<span>Поиск</span>
      </button>
      <button class="toolbar__btn" type="button" data-action="toggle-pane" title="Папки">
        ${icon('tb-folders', 22)}<span>Папки</span>
      </button>
      <div class="toolbar__sep"></div>
      <button class="toolbar__btn" type="button" data-action="views" title="Вид">
        ${icon('tb-views', 22)}<span class="toolbar__arrow"></span>
      </button>
    `
  }

  function renderAddress(): void {
    el('address-icon').innerHTML = icon(node.icon ?? 'icon-folder', 16)
    el('address-text').textContent = addressOf(path)
  }

  function renderTree(): void {
    treeEl.innerHTML = treeRows(FILE_SYSTEM, [FILE_SYSTEM.name], [], true)

    treeEl.querySelectorAll<HTMLElement>('.tree__toggle-box').forEach((box) => {
      box.addEventListener('mousedown', (e) => {
        e.stopPropagation()
        const rowPath = box.closest<HTMLElement>('.tree__row')!.dataset.path!
        expanded.has(rowPath) ? expanded.delete(rowPath) : expanded.add(rowPath)
        renderTree()
      })
    })

    treeEl.querySelectorAll<HTMLElement>('.tree__row').forEach((row) => {
      row.addEventListener('mousedown', () => go(row.dataset.path!))
    })
  }

  function treeRows(n: FSNode, parts: string[], ancestorLines: boolean[], isRoot: boolean, isLast = true): string {
    const rowPath = joinPath(parts)
    const folders = (n.children ?? []).filter((c) => c.type === 'folder')
    const isOpen = expanded.has(rowPath)

    const cells: string[] = []
    ancestorLines.forEach((line) => {
      cells.push(`<span class="tree__cell${line ? ' tree__cell--guide' : ''}"></span>`)
    })
    if (!isRoot) {
      cells.push(`<span class="tree__cell tree__cell--conn${isLast ? ' tree__cell--last' : ''}"></span>`)
    }

    const box = folders.length
      ? `<span class="tree__toggle-box${isOpen ? '' : ' tree__toggle-box--plus'}"></span>`
      : ''

    let html = `<div class="tree__row${rowPath === path ? ' selected' : ''}" data-path="${escapeAttr(rowPath)}">
      ${cells.join('')}
      <span class="tree__toggle">${box}</span>
      ${icon(n.icon ?? (isOpen ? 'icon-folder-open' : 'icon-folder'), 16, 'tree__icon')}
      <span class="tree__label">${escapeHtml(n.name)}</span>
    </div>`

    if (isOpen && folders.length) {
      const nextLines = isRoot ? [] : [...ancestorLines, !isLast]
      html += folders
        .map((child, i) => treeRows(child, [...parts, child.name], nextLines, false, i === folders.length - 1))
        .join('')
    }
    return html
  }

  function columns(): Column[] {
    return node.view === 'drives' ? COLS_DRIVES : COLS_FILES
  }

  function cellValue(item: FSNode, key: Column['key']): string {
    switch (key) {
      case 'name': return item.name
      case 'size': return item.size ?? ''
      case 'kind': return kindOf(item)
      case 'modified': return item.modified ?? ''
      case 'total': return item.total ?? ''
      case 'free': return item.free ?? ''
    }
  }

  function renderList(): void {
    const items = sortItems(node.children ?? [])

    if (view === 'icons') {
      listEl.innerHTML = items.length
        ? `<div class="iconview">${items.map((item) => `
            <div class="iconview__item${item.name === selected ? ' selected' : ''}" data-name="${escapeAttr(item.name)}">
              ${icon(item.icon ?? (item.type === 'folder' ? 'icon-folder' : 'icon-file'), 32)}
              <span class="iconview__label">${escapeHtml(item.name)}</span>
            </div>`).join('')}</div>`
        : '<div class="listview__empty">Эта папка пуста.</div>'
    } else {
      const cols = columns()
      const style = (c: Column) => c.flex ? 'flex:1 1 auto;min-width:150px' : `width:${c.width}px;flex:0 0 ${c.width}px`
      listEl.innerHTML = `
        <div class="listview__header">
          ${cols.map((c) => `<div class="listview__col" style="${style(c)}">${c.title}</div>`).join('')}
        </div>
        <div class="listview__body">
          ${items.length === 0 ? '<div class="listview__empty">Эта папка пуста.</div>' : ''}
          ${items.map((item) => `
            <div class="listview__row${item.name === selected ? ' selected' : ''}" data-name="${escapeAttr(item.name)}">
              ${cols.map((c) => c.key === 'name'
                ? `<div class="listview__cell" style="${style(c)}">${icon(item.icon ?? (item.type === 'folder' ? 'icon-folder' : 'icon-file'), 16, 'listview__icon')}<span class="listview__name">${escapeHtml(item.name)}</span></div>`
                : `<div class="listview__cell${c.numeric ? ' listview__cell--num' : ''}" style="${style(c)}">${escapeHtml(cellValue(item, c.key))}</div>`,
              ).join('')}
            </div>`).join('')}
        </div>`
    }

    listEl.querySelectorAll<HTMLElement>('.listview__row, .iconview__item').forEach((row) => {
      const name = row.dataset.name!
      row.addEventListener('mousedown', (e) => {
        e.stopPropagation()
        selected = name
        markSelection()
        renderStatus()
      })
      row.addEventListener('dblclick', () => openItem(name))
      row.addEventListener('contextmenu', (e) => {
        const me = e as MouseEvent
        me.preventDefault()
        me.stopPropagation()
        selected = name
        markSelection()
        showMenu(itemMenu(name), { x: me.clientX, y: me.clientY })
      })
    })
  }

  function markSelection(): void {
    listEl.querySelectorAll<HTMLElement>('.listview__row, .iconview__item').forEach((row) => {
      row.classList.toggle('selected', row.dataset.name === selected)
    })
  }

  function sortItems(items: FSNode[]): FSNode[] {
    return [...items].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name, 'ru')
    })
  }

  function renderStatus(): void {
    const count = node.children?.length ?? 0
    const item = selected ? node.children?.find((c) => c.name === selected) : null
    el('status-count').textContent = item
      ? `Тип: ${kindOf(item)}${item.size ? `  Размер: ${item.size}` : ''}`
      : `Объектов: ${count}`
    el('status-size').textContent = item?.size ?? (count ? '' : '')
    el('status-zone').innerHTML = `${icon('icon-computer', 16)}<span>Мой компьютер</span>`
  }

  function openItem(name: string): void {
    const item = node.children?.find((c) => c.name === name)
    if (!item) return
    if (item.type === 'folder') {
      go(path + SEP + item.name)
    } else {
      showMessage(
        `Не удается открыть файл «${item.name}».\n\nВыберите программу для открытия этого файла.`,
        'Windows',
        'error',
      )
    }
  }

  /* ───────────────────────── меню ───────────────────────── */

  function itemMenu(name: string): MenuItem[] {
    const item = node.children?.find((c) => c.name === name)
    const isFolder = item?.type === 'folder'
    return [
      { label: '&Открыть', bold: true, action: () => openItem(name) },
      ...(isFolder ? [{ label: '&Проводник', action: () => go(path + SEP + name) }] : []),
      { label: 'На&йти...', disabled: true },
      { separator: true },
      { label: 'От&править', items: [
        { label: 'Мои документы', icon: 'icon-documents', action: () => {} },
        { label: 'Рабочий стол (создать ярлык)', icon: 'icon-showdesktop', action: () => {} },
        { label: 'Сжатая ZIP-папка', icon: 'icon-folder', action: () => {} },
      ] },
      { separator: true },
      { label: 'В&ырезать', disabled: true },
      { label: '&Копировать', disabled: true },
      { separator: true },
      { label: 'Создать &ярлык', disabled: true },
      { label: '&Удалить', disabled: true },
      { label: 'Переи&меновать', disabled: true },
      { separator: true },
      { label: 'С&войства', action: () => showProperties({ name, type: isFolder ? 'folder' : 'file' }) },
    ]
  }

  function folderMenu(): MenuItem[] {
    return [
      { label: '&Вид', items: viewMenuItems() },
      { label: '&Упорядочить значки', items: [
        { label: '&Имя', action: () => renderList() },
        { label: '&Размер', disabled: true },
        { label: '&Тип', disabled: true },
        { label: '&Изменён', disabled: true },
      ] },
      { label: 'Об&новить', action: () => renderAll() },
      { separator: true },
      { label: 'Вст&авить', disabled: true },
      { label: 'Вставить &ярлык', disabled: true },
      { separator: true },
      { label: '&Создать', items: [
        { label: '&Папку', icon: 'icon-folder', action: () => {} },
        { label: '&Ярлык', icon: 'icon-file-exe', action: () => {} },
        { separator: true },
        { label: 'Текстовый документ', icon: 'icon-file-text', action: () => {} },
      ] },
      { separator: true },
      { label: 'С&войства', action: () => showProperties({ name: node.name, type: 'folder' }) },
    ]
  }

  function viewMenuItems(): MenuItem[] {
    return [
      { label: '&Эскизы страниц', disabled: true },
      { label: '&Плитка', disabled: true },
      { label: '&Значки', checked: view === 'icons', action: () => { view = 'icons'; renderList() } },
      { label: '&Список', disabled: true },
      { label: '&Таблица', checked: view === 'details', action: () => { view = 'details'; renderList() } },
    ]
  }

  function menuBar(): WindowMenu[] {
    return [
      { label: '&Файл', items: [
        { label: '&Создать', items: [
          { label: '&Папку', icon: 'icon-folder', action: () => {} },
          { label: '&Ярлык', icon: 'icon-file-exe', action: () => {} },
        ] },
        { separator: true },
        { label: 'Созда&ть ярлык', disabled: true },
        { label: '&Удалить', disabled: true },
        { label: 'Переи&меновать', disabled: true },
        { label: 'С&войства', action: () => showProperties({ name: node.name, type: 'folder' }) },
        { separator: true },
        { label: '&Закрыть', action: () => windowManager.close(winId) },
      ] },
      { label: '&Правка', items: [
        { label: '&Отменить', shortcut: 'Ctrl+Z', disabled: true },
        { separator: true },
        { label: 'В&ырезать', shortcut: 'Ctrl+X', disabled: true },
        { label: '&Копировать', shortcut: 'Ctrl+C', disabled: true },
        { label: 'Вст&авить', shortcut: 'Ctrl+V', disabled: true },
        { separator: true },
        { label: 'Выделить &всё', shortcut: 'Ctrl+A', disabled: true },
        { label: 'О&братить выделение', disabled: true },
      ] },
      { label: '&Вид', items: [
        { label: 'Панели &инструментов', items: [
          { label: '&Обычные кнопки', checked: true, action: () => {} },
          { label: '&Адресная строка', checked: true, action: () => {} },
          { label: '&Ссылки', action: () => {} },
        ] },
        { label: 'Строка &состояния', checked: true, action: () => {} },
        { label: 'Панели о&бозревателя', items: [
          { label: '&Поиск', disabled: true },
          { label: '&Избранное', disabled: true },
          { label: '&Папки', checked: paneVisible, action: () => { paneVisible = !paneVisible; renderAll() } },
        ] },
        { separator: true },
        ...viewMenuItems(),
        { separator: true },
        { label: '&Перейти', items: [
          { label: '&Назад', shortcut: 'Alt+←', disabled: historyIndex <= 0, action: back },
          { label: '&Вперёд', shortcut: 'Alt+→', disabled: historyIndex >= history.length - 1, action: forward },
          { label: 'На один уровень &вверх', disabled: !parentPath(path), action: up },
        ] },
        { label: 'Об&новить', shortcut: 'F5', action: () => renderAll() },
      ] },
      { label: 'Из&бранное', items: [
        { label: '&Добавить в избранное...', disabled: true },
        { label: '&Упорядочить избранное...', disabled: true },
        { separator: true },
        { label: '&Ссылки', items: [{ label: 'Настройка ссылок', disabled: true }] },
      ] },
      { label: 'С&ервис', items: [
        { label: '&Подключить сетевой диск...', disabled: true },
        { label: '&Отключить сетевой диск...', disabled: true },
        { separator: true },
        { label: '&Синхронизировать...', disabled: true },
        { separator: true },
        { label: 'Свойства &папки...', disabled: true },
      ] },
      { label: '&Справка', items: [
        { label: '&Вызов справки', shortcut: 'F1', disabled: true },
        { separator: true },
        { label: '&О программе', action: () => showAbout() },
      ] },
    ]
  }

  /* ───────────────────────── события ───────────────────────── */

  toolbarEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')
    if (!btn || (btn as HTMLButtonElement).disabled) return
    const rect = btn.getBoundingClientRect()
    switch (btn.dataset.action) {
      case 'back': back(); break
      case 'forward': forward(); break
      case 'up': up(); break
      case 'search': showMessage('Помощник по поиску недоступен.', 'Поиск', 'info'); break
      case 'toggle-pane': paneVisible = !paneVisible; renderAll(); break
      case 'views': showMenu(viewMenuItems(), { x: rect.left, y: rect.bottom }); break
    }
  })

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action="hide-pane"], [data-action="go"], [data-role="address-drop"]')
    if (!btn) return
    if (btn.dataset.action === 'hide-pane') { paneVisible = false; renderAll() }
    else if (btn.dataset.action === 'go') renderAll()
    else {
      const rect = el('address').getBoundingClientRect()
      showMenu(addressDropdown(), { x: rect.left, y: rect.bottom })
    }
  })

  function addressDropdown(): MenuItem[] {
    const chain = resolve(path) ?? []
    return chain.map((n, i) => ({
      label: n.name,
      icon: n.icon ?? 'icon-folder',
      action: () => go(joinPath(splitPath(path).slice(0, i + 1))),
    }))
  }

  root.addEventListener('contextmenu', (e) => {
    const me = e as MouseEvent
    if ((me.target as HTMLElement).closest('.listview__row, .iconview__item')) return
    me.preventDefault()
    me.stopPropagation()
    showMenu(folderMenu(), { x: me.clientX, y: me.clientY })
  })

  listEl.addEventListener('mousedown', () => {
    selected = null
    markSelection()
    renderStatus()
  })

  // Перетаскивание разделителя панелей
  splitterEl.addEventListener('mousedown', (e) => {
    const me = e as MouseEvent
    me.preventDefault()
    const startX = me.clientX
    const startW = paneEl.offsetWidth
    const onMove = (ev: MouseEvent) => {
      paneEl.style.width = Math.min(400, Math.max(120, startW + ev.clientX - startX)) + 'px'
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })

  renderAll()
}
