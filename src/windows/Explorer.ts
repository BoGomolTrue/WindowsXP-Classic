import {
  FILE_SYSTEM, PATH_CONTROL_PANEL, PATH_DESKTOP, PATH_MY_COMPUTER, PATH_MY_DOCUMENTS,
  PATH_MY_MUSIC, PATH_MY_PICTURES, PATH_NETWORK,
  addressOf, findNode, joinPath, kindOf, parentPath, splitPath,
  type FSNode,
} from '../data/filesystem'
import {
  addFolder,
  addShortcutFile,
  addTextFile,
  copyChildren,
  isDesktopPath,
  isSystemDesktopChild,
  itemFullPath,
  removeChild,
  renameChild,
  sortNodes,
  type SortKey,
} from '../data/filesystem-store'
import { copyItems, cutItems, canPaste, consumePaste } from '../data/clipboard'
import { addToRecycle } from '../data/recycle-bin'
import { addExplorerFavorite, loadExplorerFavorites } from '../data/favorites'
import { addUserDesktopIcon, removeUserDesktopIconByLabel, renameUserDesktopIcon } from '../data/desktop-sync'
import { escapeAttr, escapeHtml, icon } from '../utils/helpers'
import { windowManager, type WindowMenu } from './WindowManager'
import { showMenu, type MenuItem } from '../ui/Menu'
import { showMessage } from '../dialogs/MessageBox'
import { showProperties } from '../dialogs/PropertiesDialog'
import { showAbout } from '../dialogs/AboutDialog'
import { showPrompt } from '../dialogs/PromptDialog'
import { openInternetExplorer } from './InternetExplorer'
import { openFileByNode } from '../apps/openFile'
import { openSearchDialog } from '../apps/SearchDialog'
import { isArchiveFile } from '../data/archive'
import { subscribeFsChange } from '../data/fs-events'
import { compressArchiveItem, extractArchiveItem } from './WinRarDialog'
import { isImageFile } from '../data/media'

type ViewMode = 'tiles' | 'icons' | 'details'

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

const MY_COMPUTER_STORED_PATHS = [PATH_MY_PICTURES, PATH_MY_MUSIC]

const ICON_PNG: Record<string, string> = {
  'icon-documents': 'MyDocuments.png',
  'icon-pictures': 'MyPictures.png',
  'icon-music': 'MyMusic.png',
  'icon-computer': 'MyComputer.png',
  'icon-drive': 'LocalDisk.png',
  'icon-cdrom': 'RemovableMedia.png',
  'icon-controlpanel': 'ControlPanel.png',
  'icon-network': 'MyNetworkPlaces.png',
  'icon-file-jpg': 'JPG.png',
  'icon-file-text': 'Notepad.png',
  'icon-mediaplayer': 'MPC.png',
  'icon-notepad': 'Notepad.png',
  'icon-folder': 'FolderClosed.png',
  'icon-folder-open': 'FolderClosed.png',
}

interface ItemRef {
  item: FSNode
  parentPath: string
  navPath: string
}

const TILE_SELECTOR = '.listview__row, .iconview__item, .tileview__item'
const LIST_SURFACE = '.listview__body, .iconview, .tileview, .computer-view'

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
  let view: ViewMode = 'tiles'
  let paneVisible = false
  let selected = new Set<string>()
  let selectionAnchor: string | null = null
  let sortKey: SortKey = 'name'
  let toolbarVisible = true
  let addressVisible = true
  let statusVisible = true
  let linksVisible = true

  const history: string[] = [path]
  let historyIndex = 0
  const expanded = new Set<string>()
  expandAncestors(path)

  root.innerHTML = `
    <div class="explorer__rebar">
      <div class="explorer__band explorer__band--toolbar">
        <div class="toolbar" data-role="toolbar"></div>
      </div>
      <div class="explorer__band explorer__band--address">
        <div class="explorer__address">
          <span class="explorer__address-label">Адрес</span>
          <div class="explorer__address-field">
            <span class="explorer__address-icon" data-role="address-icon"></span>
            <input class="explorer__address-input" type="text" data-role="address-input" spellcheck="false" />
          </div>
          <button class="explorer__go-btn" type="button" data-action="go" title="Переход"></button>
        </div>
      </div>
    </div>
    <div class="explorer__main">
      <div class="explorer__sidebar" data-role="sidebar"></div>
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
  const sidebarEl = el('sidebar')
  const paneEl = el('pane')
  const splitterEl = el('splitter')
  const treeEl = el('tree')
  const listEl = el('list')
  listEl.tabIndex = 0

  const winId = windowManager.open({
    title: captionFor(node),
    icon: node.icon ?? 'icon-folder-open',
    width: 760,
    height: 520,
    menu: menuBar,
    content: root,
    closeSound: false,
    onClose: () => unsubFs(),
  })

  const unsubFs = subscribeFsChange(renderAll)

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
    selected.clear()
    selectionAnchor = null
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
    renderSidebar()
    renderTree()
    renderList()
    renderStatus()
    root.querySelector<HTMLElement>('.explorer__rebar')!.style.display = toolbarVisible || addressVisible ? '' : 'none'
    root.querySelector<HTMLElement>('.explorer__band--toolbar')!.style.display = toolbarVisible ? '' : 'none'
    root.querySelector<HTMLElement>('.explorer__band--address')!.style.display = addressVisible ? '' : 'none'
    root.querySelector<HTMLElement>('.statusbar')!.style.display = statusVisible ? '' : 'none'
    sidebarEl.style.display = linksVisible ? '' : 'none'
    paneEl.style.display = paneVisible ? '' : 'none'
    splitterEl.style.display = paneVisible ? '' : 'none'
  }

  const xpTbIcon = (file: string) => `<img src="/images/xp/icons/${file}" width="25" height="25" alt="">`

  function renderToolbar(): void {
    const canBack = historyIndex > 0
    const canForward = historyIndex < history.length - 1
    const canUp = parentPath(path) !== null

    toolbarEl.innerHTML = `
      <button class="toolbar__rbtn" type="button" data-action="back" ${canBack ? '' : 'disabled'} title="Назад">${xpTbIcon('Back.png')}</button>
      <button class="toolbar__rbtn" type="button" data-action="forward" ${canForward ? '' : 'disabled'} title="Вперёд">${xpTbIcon('Forward.png')}</button>
      <button class="toolbar__rbtn" type="button" data-action="up" ${canUp ? '' : 'disabled'} title="Вверх">${xpTbIcon('Up.png')}</button>
      <div class="toolbar__sep"></div>
      <button class="toolbar__rbtn" type="button" data-action="search" title="Поиск">${xpTbIcon('Search.png')}</button>
      <button class="toolbar__rbtn" type="button" data-action="toggle-pane" title="Папки">${xpTbIcon('FolderView.png')}</button>
      <div class="toolbar__sep"></div>
      <button class="toolbar__rbtn" type="button" data-action="views" title="Вид">${xpTbIcon('FolderView-Classic.png')}</button>
    `
  }

  function renderAddress(): void {
    const iconEl = el('address-icon')
    const nodeIcon = node.icon ?? 'icon-folder'
    if (nodeIcon.startsWith('icon-')) {
      iconEl.innerHTML = icon(nodeIcon, 16)
      iconEl.style.backgroundImage = ''
    } else {
      iconEl.innerHTML = ''
      iconEl.style.backgroundImage = `url(${nodeIcon})`
    }
    const input = el<HTMLInputElement>('address-input')
    input.value = addressOf(path)
  }

  function sidebarLink(iconFile: string, label: string, action: string): string {
    return `<button class="explorer__sidebar-link" type="button" data-sidebar="${escapeAttr(action)}">
      <img src="/images/xp/icons/${iconFile}" width="20" height="20" alt="">
      <span>${escapeHtml(label)}</span>
    </button>`
  }

  function renderSidebar(): void {
    const atComputer = path === PATH_MY_COMPUTER
    const tasks = atComputer
      ? [
          sidebarLink('explorerproperties.png', 'Сведения о системе', 'about'),
          sidebarLink('Programs.png', 'Установка и удаление программ', 'noop'),
          sidebarLink('ControlPanel.png', 'Изменение параметров', 'control-panel'),
        ]
      : [
          sidebarLink('Search.png', 'Поиск файлов или папок', 'search'),
        ]

    const places = [
      sidebarLink('MyComputer.png', 'Мой компьютер', PATH_MY_COMPUTER),
      sidebarLink('MyPictures.png', 'Мои рисунки', PATH_MY_PICTURES),
      sidebarLink('MyMusic.png', 'Моя музыка', PATH_MY_MUSIC),
      sidebarLink('MyDocuments.png', 'Мои документы', PATH_MY_DOCUMENTS),
      sidebarLink('MyNetworkPlaces.png', 'Сетевое окружение', PATH_NETWORK),
    ]

    const folderTasks = !atComputer && node.type === 'folder'
      ? [
          sidebarLink('NewFolder.png', 'Создать новую папку', 'new-folder'),
          sidebarLink('Search.png', 'Поиск в этой папке', 'search'),
        ]
      : []

    sidebarEl.innerHTML = `
      <div class="explorer__sidebar-section">
        <div class="explorer__sidebar-head">Системные задачи</div>
        <div class="explorer__sidebar-body">${tasks.join('')}</div>
      </div>
      <div class="explorer__sidebar-section">
        <div class="explorer__sidebar-head">Другие места</div>
        <div class="explorer__sidebar-body">${places.join('')}</div>
      </div>
      ${folderTasks.length ? `<div class="explorer__sidebar-section">
        <div class="explorer__sidebar-head">Задачи для файлов и папок</div>
        <div class="explorer__sidebar-body">${folderTasks.join('')}</div>
      </div>` : ''}
    `
  }

  function navigateAddressInput(): void {
    const next = el<HTMLInputElement>('address-input').value.trim()
    if (!next) return
    if (findNode(next)) {
      go(next)
      return
    }
    showMessage(`Путь «${next}» не найден.`, 'Проводник', 'error')
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

  function itemRef(name: string): ItemRef | null {
    const child = node.children?.find((c) => c.name === name)
    if (child) {
      return { item: child, parentPath: path, navPath: itemFullPath(path, name) }
    }
    if (path === PATH_MY_COMPUTER) {
      for (const storedPath of MY_COMPUTER_STORED_PATHS) {
        const stored = findNode(storedPath)
        if (stored?.name === name) {
          const parent = parentPath(storedPath)
          return { item: stored, parentPath: parent ?? path, navPath: storedPath }
        }
      }
    }
    return null
  }

  function itemIconSrc(item: FSNode): string {
    if (item.kind === 'Локальный диск') return '/images/xp/icons/LocalDisk.png'
    if (item.kind === 'Компакт-диск') return '/images/xp/icons/RemovableMedia.png'
    if (item.icon?.endsWith('.png')) return `/images/xp/icons/${item.icon}`
    if (item.icon && ICON_PNG[item.icon]) return `/images/xp/icons/${ICON_PNG[item.icon]}`
    if (item.type === 'folder') return '/images/xp/icons/FolderClosed.png'
    return '/images/xp/icons/Default.png'
  }

  function itemVisualHtml(item: FSNode): string {
    if (item.mediaUrl && isImageFile(item.name)) {
      return `<img class="tileview__thumb" src="${escapeAttr(item.mediaUrl)}" width="50" height="50" alt="">`
    }
    return `<img class="tileview__icon" src="${escapeAttr(itemIconSrc(item))}" width="50" height="50" alt="">`
  }

  function tileHtml(item: FSNode, navPath: string): string {
    const sel = selected.has(item.name) ? ' selected' : ''
    return `<div class="tileview__item${sel}" data-name="${escapeAttr(item.name)}" data-path="${escapeAttr(navPath)}">
      ${itemVisualHtml(item)}
      <span class="tileview__label">${escapeHtml(item.name)}</span>
    </div>`
  }

  function sectionHtml(title: string, tiles: string): string {
    return `<section class="computer-section">
      <h3 class="computer-section__title">${escapeHtml(title)}</h3>
      <div class="computer-section__line"></div>
      <div class="computer-section__items">${tiles}</div>
    </section>`
  }

  function renderMyComputer(): void {
    const children = node.children ?? []
    const drives = children.filter((c) => c.kind === 'Локальный диск')
    const removable = children.filter((c) => c.kind === 'Компакт-диск' || c.name.includes('Дисковод'))
    const stored = MY_COMPUTER_STORED_PATHS.map((p) => findNode(p)).filter(Boolean) as FSNode[]
    const system = children.filter((c) => c.type === 'folder' && !drives.includes(c) && !removable.includes(c))

    let html = '<div class="computer-view">'
    const storedTiles = [
      ...stored.map((item, i) => tileHtml(item, MY_COMPUTER_STORED_PATHS[i]!)),
      ...system.map((item) => tileHtml(item, itemFullPath(path, item.name))),
    ]
    if (storedTiles.length) {
      html += sectionHtml('Файлы, хранящиеся на этом компьютере', storedTiles.join(''))
    }
    if (drives.length) {
      html += sectionHtml('Жесткие диски', drives.map((item) => tileHtml(item, itemFullPath(path, item.name))).join(''))
    }
    if (removable.length) {
      html += sectionHtml('Устройства со съемными носителями', removable.map((item) => tileHtml(item, itemFullPath(path, item.name))).join(''))
    }
    html += '</div>'
    listEl.innerHTML = html
  }

  function renderList(): void {
    if (path === PATH_MY_COMPUTER && view === 'tiles') {
      renderMyComputer()
      bindListItems()
      bindListMarquee()
      return
    }

    const items = sortItems(node.children ?? [])

    if (view === 'tiles') {
      listEl.innerHTML = items.length
        ? `<div class="tileview">${items.map((item) => tileHtml(item, itemFullPath(path, item.name))).join('')}</div>`
        : '<div class="listview__empty">Эта папка пуста.</div>'
    } else if (view === 'icons') {
      listEl.innerHTML = items.length
        ? `<div class="iconview">${items.map((item) => `
            <div class="iconview__item${selected.has(item.name) ? ' selected' : ''}" data-name="${escapeAttr(item.name)}">
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
            <div class="listview__row${selected.has(item.name) ? ' selected' : ''}" data-name="${escapeAttr(item.name)}">
              ${cols.map((c) => c.key === 'name'
                ? `<div class="listview__cell" style="${style(c)}">${icon(item.icon ?? (item.type === 'folder' ? 'icon-folder' : 'icon-file'), 16, 'listview__icon')}<span class="listview__name">${escapeHtml(item.name)}</span></div>`
                : `<div class="listview__cell${c.numeric ? ' listview__cell--num' : ''}" style="${style(c)}">${escapeHtml(cellValue(item, c.key))}</div>`,
              ).join('')}
            </div>`).join('')}
        </div>`
    }

    bindListItems()
    bindListMarquee()
  }

  function sortedNames(): string[] {
    return sortItems(node.children ?? []).map((item) => item.name)
  }

  function handleItemSelect(name: string, e: MouseEvent): void {
    if (e.ctrlKey || e.metaKey) {
      if (selected.has(name)) selected.delete(name)
      else selected.add(name)
      selectionAnchor = name
    } else if (e.shiftKey && selectionAnchor) {
      const names = sortedNames()
      const from = names.indexOf(selectionAnchor)
      const to = names.indexOf(name)
      if (from >= 0 && to >= 0) {
        selected.clear()
        const [start, end] = from < to ? [from, to] : [to, from]
        for (let i = start; i <= end; i += 1) selected.add(names[i]!)
      }
    } else if (!selected.has(name)) {
      selected.clear()
      selected.add(name)
      selectionAnchor = name
    } else {
      selectionAnchor = name
    }
    markSelection()
    renderStatus()
  }

  function bindListItems(): void {
    listEl.querySelectorAll<HTMLElement>(TILE_SELECTOR).forEach((row) => {
      const name = row.dataset.name!
      row.addEventListener('mousedown', (e) => {
        const me = e as MouseEvent
        if (me.button !== 0) return
        me.stopPropagation()
        handleItemSelect(name, me)
      })
      row.addEventListener('dblclick', (e) => {
        e.preventDefault()
        e.stopPropagation()
        openItem(name)
      })
      row.addEventListener('contextmenu', (e) => {
        const me = e as MouseEvent
        me.preventDefault()
        me.stopPropagation()
        if (!selected.has(name)) {
          selected.clear()
          selected.add(name)
          selectionAnchor = name
          markSelection()
        }
        showMenu(selected.size > 1 ? selectionMenu() : itemMenu(name), { x: me.clientX, y: me.clientY })
      })
    })
  }

  function bindListMarquee(): void {
    const body = listEl.querySelector<HTMLElement>(LIST_SURFACE)
    if (!body) return

    body.onmousedown = (e) => {
      const me = e as MouseEvent
      if (me.button !== 0) return
      if ((me.target as HTMLElement).closest(TILE_SELECTOR)) return

      me.preventDefault()
      listEl.focus()

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
          marquee.className = 'explorer__marquee'
          body.appendChild(marquee)
        }

        const rect = body.getBoundingClientRect()
        const left = Math.min(startX, ev.clientX) - rect.left + body.scrollLeft
        const top = Math.min(startY, ev.clientY) - rect.top + body.scrollTop
        const width = Math.abs(ev.clientX - startX)
        const height = Math.abs(ev.clientY - startY)
        marquee.style.left = `${left}px`
        marquee.style.top = `${top}px`
        marquee.style.width = `${width}px`
        marquee.style.height = `${height}px`

        const box = marquee.getBoundingClientRect()
        selected.clear()
        listEl.querySelectorAll<HTMLElement>(TILE_SELECTOR).forEach((row) => {
          const rowBox = row.getBoundingClientRect()
          const hit = !(rowBox.right < box.left || rowBox.left > box.right || rowBox.bottom < box.top || rowBox.top > box.bottom)
          if (hit) selected.add(row.dataset.name!)
        })
        markSelection()
        renderStatus()
      }

      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        marquee?.remove()
        if (!dragged) {
          selected.clear()
          selectionAnchor = null
          markSelection()
          renderStatus()
        } else if (selected.size === 1) {
          selectionAnchor = selected.values().next().value ?? null
        }
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }
  }

  function markSelection(): void {
    listEl.querySelectorAll<HTMLElement>(TILE_SELECTOR).forEach((row) => {
      row.classList.toggle('selected', selected.has(row.dataset.name!))
    })
  }

  function sortItems(items: FSNode[]): FSNode[] {
    return sortNodes(items, sortKey)
  }

  function selectedNames(): string[] {
    return [...selected]
  }

  function isModifiableName(name: string): boolean {
    return !(isDesktopPath(path) && isSystemDesktopChild(name))
  }

  function canModifySelection(): boolean {
    const names = selectedNames()
    return names.length > 0 && names.every(isModifiableName)
  }

  function canRenameSelection(): boolean {
    return selected.size === 1 && isModifiableName(selectedNames()[0]!)
  }

  function createFolderHere(): void {
    const created = addFolder(path)
    if (!created) return
    if (isDesktopPath(path)) addUserDesktopIcon(created.name, 'folder', 'icon-folder')
    selected.clear()
    selected.add(created.name)
    selectionAnchor = created.name
    renderAll()
  }

  async function createShortcutHere(): Promise<void> {
    const input = await showPrompt('Укажите расположение объекта:', 'Создание ярлыка')
    if (!input) return
    const label = input.split(/[\\/]/).pop() ?? input
    const created = addShortcutFile(path, label, `path:${input}`, 'icon-file-exe')
    if (created && isDesktopPath(path)) {
      addUserDesktopIcon(created.name, 'shortcut', 'icon-file-exe', { target: `path:${input}` })
    }
    renderAll()
  }

  function createTextHere(): void {
    const created = addTextFile(path)
    if (created && isDesktopPath(path)) {
      addUserDesktopIcon(created.name, 'file', 'icon-file-text')
    }
    selected.clear()
    if (created) {
      selected.add(created.name)
      selectionAnchor = created.name
    }
    renderAll()
  }

  function deleteSelected(): void {
    const names = selectedNames().filter(isModifiableName)
    if (!names.length) return
    for (const name of names) {
      const removed = removeChild(path, name)
      if (removed) addToRecycle(path, removed)
      if (isDesktopPath(path)) removeUserDesktopIconByLabel(name)
    }
    selected.clear()
    selectionAnchor = null
    renderAll()
  }

  async function renameSelected(): Promise<void> {
    if (!canRenameSelection()) return
    const current = selectedNames()[0]!
    const next = await showPrompt('Введите новое имя:', 'Переименование', current)
    if (!next || next === current) return
    if (!renameChild(path, current, next)) {
      void showMessage('Объект с таким именем уже существует.', 'Переименование', 'warning')
      return
    }
    if (isDesktopPath(path)) renameUserDesktopIcon(current, next)
    selected.clear()
    selected.add(next)
    selectionAnchor = next
    renderAll()
  }

  function copySelected(): void {
    const names = selectedNames()
    if (!names.length) return
    copyItems(path, names)
  }

  function cutSelected(): void {
    if (!canModifySelection()) return
    const names = selectedNames()
    if (!names.length) return
    cutItems(path, names)
  }

  function pasteHere(): void {
    consumePaste(path, (from, names, cut) => {
      const before = new Set((findNode(path)?.children ?? []).map((child) => child.name))
      const ok = copyChildren(from, names, path, cut)
      if (ok && isDesktopPath(path)) {
        for (const child of findNode(path)?.children ?? []) {
          if (before.has(child.name)) continue
          addUserDesktopIcon(
            child.name,
            child.type === 'folder' ? 'folder' : child.shortcutTarget ? 'shortcut' : 'file',
            child.icon ?? 'icon-file',
            child.shortcutTarget ? { target: child.shortcutTarget } : undefined,
          )
        }
      }
      if (ok && cut && isDesktopPath(from)) {
        for (const name of names) removeUserDesktopIconByLabel(name)
      }
      if (ok) renderAll()
      return ok
    })
  }

  function selectAll(): void {
    selected.clear()
    for (const child of node.children ?? []) selected.add(child.name)
    selectionAnchor = node.children?.[0]?.name ?? null
    markSelection()
    renderStatus()
  }

  function invertSelection(): void {
    if (!node.children?.length) return
    const next = new Set<string>()
    for (const child of node.children) {
      if (!selected.has(child.name)) next.add(child.name)
    }
    selected = next
    selectionAnchor = next.values().next().value ?? null
    markSelection()
    renderStatus()
  }

  function renderStatus(): void {
    const count = node.children?.length ?? 0
    const names = selectedNames()
    if (names.length === 1) {
      const item = node.children?.find((c) => c.name === names[0])
      el('status-count').textContent = item
        ? `Тип: ${kindOf(item)}${item.size ? `  Размер: ${item.size}` : ''}`
        : `Объектов: ${count}`
      el('status-size').textContent = item?.size ?? (count ? '' : '')
    } else if (names.length > 1) {
      el('status-count').textContent = `Выбрано объектов: ${names.length}`
      el('status-size').textContent = ''
    } else {
      el('status-count').textContent = `Объектов: ${count}`
      el('status-size').textContent = count ? '' : ''
    }
    el('status-zone').innerHTML = `${icon('icon-computer', 16)}<span>Мой компьютер</span>`
  }

  function openItem(name: string): void {
    const ref = itemRef(name)
    if (!ref) return
    if (ref.item.type === 'folder') {
      go(ref.navPath)
      return
    }
    openFileByNode(ref.item, ref.parentPath)
  }

  /* ───────────────────────── меню ───────────────────────── */

  function itemMenu(name: string): MenuItem[] {
    const ref = itemRef(name)
    const item = ref?.item
    const itemParent = ref?.parentPath ?? path
    const isFolder = item?.type === 'folder'
    const isArchive = item?.type === 'file' && isArchiveFile(name)
    const modifiable = isModifiableName(name) && path !== PATH_MY_COMPUTER
    const navPath = ref?.navPath ?? itemFullPath(path, name)
    return [
      { label: '&Открыть', bold: true, action: () => openItem(name) },
      ...(isFolder ? [{ label: '&Проводник', action: () => go(navPath) }] : []),
      ...(isArchive ? [{ label: 'Извлечь &сюда', icon: 'RAR.png', action: () => extractArchiveItem(itemParent, name) }] : []),
      ...(!isArchive && item ? [{ label: 'Добавить в &архив...', icon: 'RAR.png', action: () => compressArchiveItem(itemParent, name) }] : []),
      { label: 'На&йти...', action: () => openSearchDialog() },
      { separator: true },
      { label: 'От&править', items: [
        { label: 'Мои документы', icon: 'icon-documents', action: () => copyItems(path, [name]) },
        {
          label: 'Рабочий стол (создать ярлык)',
          icon: 'icon-showdesktop',
          action: () => {
            addShortcutFile(PATH_DESKTOP, name, `path:${navPath}`, item?.icon ?? 'icon-file-exe')
            addUserDesktopIcon(`${name}.lnk`, 'shortcut', 'icon-file-exe', { target: `path:${navPath}` })
          },
        },
        { label: 'Сжатая ZIP-папка', icon: 'Zipfolder.png', action: () => compressArchiveItem(itemParent, name) },
      ] },
      { separator: true },
      { label: 'В&ырезать', disabled: !modifiable, action: cutSelected },
      { label: '&Копировать', action: () => copyItems(path, [name]) },
      { separator: true },
      { label: 'Создать &ярлык', action: () => {
        addShortcutFile(path, name, `path:${navPath}`, item?.icon ?? 'icon-file-exe')
        renderAll()
      } },
      { label: '&Удалить', disabled: !modifiable, action: deleteSelected },
      { label: 'Переи&меновать', disabled: !modifiable, action: () => void renameSelected() },
      { separator: true },
      { label: 'С&войства', action: () => showProperties({ name, type: isFolder ? 'folder' : 'file' }) },
    ]
  }

  function folderMenu(): MenuItem[] {
    return [
      { label: '&Вид', items: viewMenuItems() },
      { label: '&Упорядочить значки', items: [
        { label: '&Имя', action: () => { sortKey = 'name'; renderList() } },
        { label: '&Размер', action: () => { sortKey = 'size'; renderList() } },
        { label: '&Тип', action: () => { sortKey = 'kind'; renderList() } },
        { label: '&Изменён', action: () => { sortKey = 'modified'; renderList() } },
      ] },
      { label: 'Об&новить', action: () => renderAll() },
      { separator: true },
      { label: 'Вст&авить', disabled: !canPaste(), action: pasteHere },
      { label: 'Вставить &ярлык', disabled: !canPaste(), action: () => void createShortcutHere() },
      { separator: true },
      { label: '&Создать', items: [
        { label: '&Папку', icon: 'icon-folder', action: createFolderHere },
        { label: '&Ярлык', icon: 'icon-file-exe', action: () => void createShortcutHere() },
        { separator: true },
        { label: 'Текстовый документ', icon: 'icon-file-text', action: createTextHere },
      ] },
      { separator: true },
      { label: 'С&войства', action: () => showProperties({ name: node.name, type: 'folder' }) },
    ]
  }

  function viewMenuItems(): MenuItem[] {
    return [
      { label: '&Эскизы страниц', action: () => { view = 'tiles'; renderList() } },
      { label: '&Плитка', checked: view === 'tiles', action: () => { view = 'tiles'; renderList() } },
      { label: '&Значки', checked: view === 'icons', action: () => { view = 'icons'; renderList() } },
      { label: '&Список', action: () => { view = 'details'; renderList() } },
      { label: '&Таблица', checked: view === 'details', action: () => { view = 'details'; renderList() } },
    ]
  }

  function selectionMenu(): MenuItem[] {
    const modifiable = canModifySelection()
    const first = selectedNames()[0]
    return [
      { label: '&Открыть', bold: true, disabled: selected.size !== 1 || !first, action: () => first && openItem(first) },
      { separator: true },
      { label: 'В&ырезать', disabled: !modifiable, action: cutSelected },
      { label: '&Копировать', action: copySelected },
      { separator: true },
      { label: '&Удалить', disabled: !modifiable, action: deleteSelected },
      { label: 'Переи&меновать', disabled: !canRenameSelection(), action: () => void renameSelected() },
    ]
  }

  function menuBar(): WindowMenu[] {
    const modifiable = canModifySelection()
    const hasSelection = selected.size > 0
    const single = selectedNames()[0]
    return [
      { label: '&Файл', items: [
        { label: '&Создать', items: [
          { label: '&Папку', icon: 'icon-folder', action: createFolderHere },
          { label: '&Ярлык', icon: 'icon-file-exe', action: () => void createShortcutHere() },
        ] },
        { separator: true },
        { label: 'Созда&ть ярлык', disabled: selected.size !== 1 || !single, action: () => single && addShortcutFile(path, single, `path:${itemFullPath(path, single)}`, 'icon-file-exe') },
        { label: '&Удалить', disabled: !modifiable, action: deleteSelected },
        { label: 'Переи&меновать', disabled: !canRenameSelection(), action: () => void renameSelected() },
        { label: 'С&войства', action: () => showProperties({ name: node.name, type: 'folder' }) },
        { separator: true },
        { label: '&Закрыть', action: () => windowManager.close(winId) },
      ] },
      { label: '&Правка', items: [
        { label: '&Отменить', shortcut: 'Ctrl+Z', disabled: true },
        { separator: true },
        { label: 'В&ырезать', shortcut: 'Ctrl+X', disabled: !modifiable, action: cutSelected },
        { label: '&Копировать', shortcut: 'Ctrl+C', disabled: !hasSelection, action: copySelected },
        { label: 'Вст&авить', shortcut: 'Ctrl+V', disabled: !canPaste(), action: pasteHere },
        { separator: true },
        { label: 'Выделить &всё', shortcut: 'Ctrl+A', action: selectAll },
        { label: 'О&братить выделение', action: invertSelection },
      ] },
      { label: '&Вид', items: [
        { label: 'Панели &инструментов', items: [
          { label: '&Обычные кнопки', checked: toolbarVisible, action: () => { toolbarVisible = !toolbarVisible; renderAll() } },
          { label: '&Адресная строка', checked: addressVisible, action: () => { addressVisible = !addressVisible; renderAll() } },
          { label: '&Ссылки', checked: linksVisible, action: () => { linksVisible = !linksVisible; renderAll() } },
        ] },
        { label: 'Строка &состояния', checked: statusVisible, action: () => { statusVisible = !statusVisible; renderAll() } },
        { label: 'Панели о&бозревателя', items: [
          { label: '&Поиск', action: () => openSearchDialog() },
          { label: '&Избранное', action: () => addExplorerFavorite(path) },
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
        { label: '&Добавить в избранное...', action: () => addExplorerFavorite(path) },
        { label: '&Упорядочить избранное...', action: () => showMessage('Избранное упорядочено по имени.', 'Избранное', 'info') },
        { separator: true },
        ...loadExplorerFavorites().map((fav) => ({
          label: fav.split('\\').pop() ?? fav,
          icon: 'icon-folder',
          action: () => go(fav),
        })),
      ] },
      { label: 'С&ервис', items: [
        { label: '&Подключить сетевой диск...', action: () => showMessage('Сетевой диск Z: подключён (имитация).', 'Сервис', 'info') },
        { label: '&Отключить сетевой диск...', action: () => showMessage('Сетевой диск отключён.', 'Сервис', 'info') },
        { separator: true },
        { label: '&Синхронизировать...', action: () => showMessage('Синхронизация завершена.', 'Сервис', 'info') },
        { separator: true },
        { label: 'Свойства &папки...', action: () => showProperties({ name: node.name, type: 'folder' }) },
      ] },
      { label: '&Справка', items: [
        { label: '&Вызов справки', shortcut: 'F1', action: () => openInternetExplorer('https://vertix-bot.ru') },
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
      case 'search': openSearchDialog(); break
      case 'toggle-pane': paneVisible = !paneVisible; renderAll(); break
      case 'views': showMenu(viewMenuItems(), { x: rect.left, y: rect.bottom }); break
    }
  })

  root.addEventListener('click', (e) => {
    const sidebarBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-sidebar]')
    if (sidebarBtn) {
      const action = sidebarBtn.dataset.sidebar!
      if (action === 'about') showAbout()
      else if (action === 'search') openSearchDialog()
      else if (action === 'control-panel') go(PATH_CONTROL_PANEL)
      else if (action === 'new-folder') createFolderHere()
      else if (action === 'noop') showMessage('Эта функция недоступна в данной версии.', 'Проводник', 'info')
      else if (findNode(action)) go(action)
      return
    }

    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action="hide-pane"], [data-action="go"]')
    if (!btn) return
    if (btn.dataset.action === 'hide-pane') { paneVisible = false; renderAll() }
    else if (btn.dataset.action === 'go') navigateAddressInput()
  })

  el<HTMLInputElement>('address-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      navigateAddressInput()
    }
  })

  el<HTMLInputElement>('address-input').addEventListener('focus', (e) => {
    (e.target as HTMLInputElement).select()
  })

  root.addEventListener('contextmenu', (e) => {
    const me = e as MouseEvent
    if ((me.target as HTMLElement).closest(TILE_SELECTOR)) return
    me.preventDefault()
    me.stopPropagation()
    showMenu(folderMenu(), { x: me.clientX, y: me.clientY })
  })

  listEl.addEventListener('keydown', (e) => {
    if (e.key === 'Delete') {
      e.preventDefault()
      deleteSelected()
    } else if (e.key === 'F2') {
      e.preventDefault()
      void renameSelected()
    } else if (e.ctrlKey && e.key === 'a') {
      e.preventDefault()
      selectAll()
    } else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault()
      copySelected()
    } else if (e.ctrlKey && e.key === 'x') {
      e.preventDefault()
      cutSelected()
    } else if (e.ctrlKey && e.key === 'v') {
      e.preventDefault()
      pasteHere()
    }
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
