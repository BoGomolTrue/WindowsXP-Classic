import { windowManager } from '../windows/WindowManager'
import { findNode, FILE_SYSTEM, PATH_DESKTOP, saveFileSystem, type FSNode } from '../data/filesystem'

/* ═══════════════════════════════════════════════════════════════
   БЛОКНОТ (Ace Editor)
   ═══════════════════════════════════════════════════════════════ */

export function openNotepad(initial = '', title = 'Блокнот - Безымянный', fsPath?: string): void {
  const root = document.createElement('div')
  root.className = 'notepad'
  const iframe = document.createElement('iframe')
  iframe.className = 'notepad__iframe'
  iframe.src = '/html/notepad/index.html'
  iframe.setAttribute('frameborder', '0')
  root.appendChild(iframe)

  let currentFsPath = fsPath
  let dirty = false
  let wordWrap = false

  const getEditor = () => iframe.contentWindow as any

  const markDirty = () => {
    const baseName = title.replace(/ - Блокнот$/, '').replace(/^\*/, '*')
    windowManager.setTitle(winId, dirty ? `*${baseName} - Блокнот` : `${baseName} - Блокнот`)
  }

  const syncDirty = () => {
    const ed = getEditor()
    if (!ed || !ed.is_dirty) return
    dirty = ed.is_dirty()
    markDirty()
  }

  const save = () => {
    const ed = getEditor()
    if (!ed || !ed.get_content) return
    const content = ed.get_content()
    if (currentFsPath) {
      const node = findNode(currentFsPath)
      if (node) { node.content = content; ed.set_clean?.(); dirty = false; markDirty(); saveFileSystem() }
    }
  }

  const saveAs = async () => {
    const ed = getEditor()
    if (!ed || !ed.get_content) return
    const { showPrompt } = await import('../dialogs/PromptDialog')
    const name = await showPrompt('Введите имя нового файла:', 'Сохранение как')
    if (!name) return
    currentFsPath = `Рабочий стол\\${name}`
    const content = ed.get_content()
    const parent = findNode(PATH_DESKTOP)
    if (parent) {
      if (!parent.children) parent.children = []
      parent.children.push({ name, type: 'file', icon: 'icon-file-text', content, size: `${Math.ceil(content.length / 1024)} КБ`, modified: new Date().toLocaleString('ru-RU') })
    }
    ed.set_clean?.()
    dirty = false
    windowManager.setTitle(winId, `${name} - Блокнот`)
  }

  iframe.addEventListener('load', () => {
    const ed = getEditor()
    if (!ed || !ed.set_content) return
    if (initial) ed.set_content(initial)
    ed.set_clean?.()
    dirty = false

    ed.dirty_state_changed = () => { syncDirty() }

    ed.parent_key_event = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); e.stopPropagation(); save(); return true }
      return false
    }
  })

  const winId = windowManager.open({
    title, icon: 'icon-notepad', width: 640, height: 480, content: root,
    menu: () => [
      { label: '&Файл', items: [
        { label: '&Сохранить', shortcut: 'Ctrl+S', action: save },
        { label: 'Сохранить &как...', action: () => void saveAs() },
      ]},
      { label: '&Правка', items: [
        { label: '&Отменить', shortcut: 'Ctrl+Z', action: () => getEditor()?.undo?.() },
        { label: '&Повторить', shortcut: 'Ctrl+Y', action: () => getEditor()?.redo?.() },
        { separator: true },
        { label: 'Най&ти...', shortcut: 'Ctrl+F', action: () => getEditor()?.find?.() },
        { label: 'Заме&нить...', shortcut: 'Ctrl+H', action: () => getEditor()?.replace?.() },
      ]},
      { label: '&Вид', items: [
        { label: 'Пе&ренос слов', checked: wordWrap, action: () => { wordWrap = !wordWrap; getEditor()?.toggle_wrap?.() } },
      ]},
    ],
  })
}

/* ═══════════════════════════════════════════════════════════════
   WORDPAD
   ═══════════════════════════════════════════════════════════════ */

export function openWordPad(initial = '', title = 'Документ1 - WordPad', fsPath?: string): void {
  const root = document.createElement('div')
  root.className = 'wordpad'
  root.innerHTML = `
    <div class="wordpad__format">
      <select class="wordpad__font xp-input" data-cmd="fontName">
        <option value="Times New Roman">Times New Roman</option>
        <option value="Arial">Arial</option>
        <option value="Courier New">Courier New</option>
        <option value="Tahoma" selected>Tahoma</option>
        <option value="Verdana">Verdana</option>
        <option value="Georgia">Georgia</option>
      </select>
      <select class="wordpad__size xp-input" data-cmd="fontSize">
        <option value="1">8</option><option value="2" selected>10</option>
        <option value="3">12</option><option value="4">14</option>
        <option value="5">18</option><option value="6">24</option>
        <option value="7">36</option>
      </select>
      <div class="wordpad__sep"></div>
      <button class="wordpad__fmt-btn" data-cmd="bold" title="Полужирный"><b>B</b></button>
      <button class="wordpad__fmt-btn" data-cmd="italic" title="Курсив"><i>I</i></button>
      <button class="wordpad__fmt-btn" data-cmd="underline" title="Подчёркнутый"><u>U</u></button>
      <div class="wordpad__sep"></div>
      <button class="wordpad__fmt-btn" data-cmd="justifyLeft" title="По левому краю">≡</button>
      <button class="wordpad__fmt-btn" data-cmd="justifyCenter" title="По центру">≡</button>
      <button class="wordpad__fmt-btn" data-cmd="justifyRight" title="По правому краю">≡</button>
    </div>
    <div class="wordpad__area" contenteditable="true" spellcheck="false">${initial.replace(/\n/g, '<br>')}</div>
  `
  const area = root.querySelector<HTMLElement>('.wordpad__area')!
  let currentFsPath = fsPath
  let savedContent = initial

  const markDirty = () => {
    const dirty = area.innerHTML !== savedContent
    const baseName = title.replace(/ - WordPad$/, '').replace(/^\*/, '*')
    windowManager.setTitle(winId, dirty ? `*${baseName} - WordPad` : `${baseName} - WordPad`)
  }

  root.querySelectorAll<HTMLButtonElement>('.wordpad__fmt-btn').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); document.execCommand(btn.dataset.cmd!) })
  })
  root.querySelectorAll<HTMLSelectElement>('.wordpad__font, .wordpad__size').forEach((sel) => {
    sel.addEventListener('change', () => { document.execCommand(sel.dataset.cmd!, false, sel.value) })
  })

  area.addEventListener('input', markDirty)

  const save = () => {
    if (!currentFsPath) return
    const node = findNode(currentFsPath)
    if (node) { node.content = area.innerText; savedContent = area.innerHTML; markDirty() }
  }

  const winId = windowManager.open({
    title, icon: 'icon-file-doc', width: 680, height: 500, content: root,
    menu: () => [
      { label: '&Файл', items: [
        { label: '&Сохранить', shortcut: 'Ctrl+S', action: save },
      ]},
      { label: '&Правка', items: [
        { label: '&Отменить', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
        { label: '&Повторить', shortcut: 'Ctrl+Y', action: () => document.execCommand('redo') },
        { separator: true },
        { label: 'Вы&делить всё', shortcut: 'Ctrl+A', action: () => { const r = document.createRange(); r.selectNodeContents(area); const s = window.getSelection()!; s.removeAllRanges(); s.addRange(r) } },
      ]},
    ],
  })

  area.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); save() }
  })
}

/* ═══════════════════════════════════════════════════════════════
   КАЛЬКУЛЯТОР
   ═══════════════════════════════════════════════════════════════ */

export function openCalculator(): void {
  const root = document.createElement('div')
  root.className = 'calc'

  const historyEl = document.createElement('div')
  historyEl.className = 'calc__history'
  root.appendChild(historyEl)

  const display = document.createElement('input')
  display.className = 'calc__display xp-input'
  display.readOnly = true
  display.value = '0'
  root.appendChild(display)

  let current = '0'
  let operand: number | null = null
  let operator = ''
  let fresh = true
  let memory = 0
  let lastExpr = ''

  const update = () => { display.value = current }

  const calcLayout = [
    ['MC','MR','MS','M+'],
    ['Back','CE','C','±'],
    ['7','8','9','/'],
    ['4','5','6','*'],
    ['1','2','3','-'],
    ['0','.','=','+'],
    ['sqrt','%','1/x',' '],
  ]

  const grid = document.createElement('div')
  grid.className = 'calc__grid'
  for (const row of calcLayout) {
    for (const key of row) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'calc__key xp-btn'
      if (key === ' ') { btn.style.visibility = 'hidden'; grid.appendChild(btn); continue }
      btn.textContent = key
      btn.addEventListener('click', () => handleKey(key))
      grid.appendChild(btn)
    }
  }
  root.appendChild(grid)

  const handleKey = (key: string) => {
    if (key >= '0' && key <= '9') {
      current = fresh || current === '0' && !current.includes('.') ? key : current + key
      fresh = false
      update()
      return
    }
    if (key === '.') {
      if (!current.includes('.')) current += '.'
      fresh = false
      update()
      return
    }
    if (key === 'C') { current = '0'; operand = null; operator = ''; fresh = true; historyEl.textContent = ''; update(); return }
    if (key === 'CE') { current = '0'; fresh = true; update(); return }
    if (key === 'Back') { current = current.length > 1 ? current.slice(0, -1) : '0'; update(); return }
    if (key === '±') { current = String(-parseFloat(current)); update(); return }
    if (key === 'sqrt') { const v = parseFloat(current); current = v < 0 ? 'Ошибка' : String(Math.sqrt(v)); fresh = true; update(); return }
    if (key === '1/x') { const v = parseFloat(current); current = v === 0 ? 'Ошибка' : String(1 / v); fresh = true; update(); return }
    if (key === '%') { if (operand !== null) current = String(operand * parseFloat(current) / 100); fresh = true; update(); return }
    if (key === 'MC') { memory = 0; return }
    if (key === 'MR') { current = String(memory); fresh = true; update(); return }
    if (key === 'MS') { memory = parseFloat(current); return }
    if (key === 'M+') { memory += parseFloat(current); return }
    if (key === '=') {
      if (operator && operand !== null) {
        const b = parseFloat(current)
        const result = exec(operand, b, operator)
        lastExpr = `${operand} ${operator} ${b} =`
        historyEl.textContent = lastExpr
        current = String(result)
        operand = null; operator = ''; fresh = true
        update()
      }
      return
    }
    if (['+', '-', '*', '/'].includes(key)) {
      if (operator && operand !== null && !fresh) {
        const b = parseFloat(current)
        const result = exec(operand, b, operator)
        current = String(result)
        operand = result
      } else {
        operand = parseFloat(current)
      }
      operator = key
      lastExpr = `${operand} ${key}`
      historyEl.textContent = lastExpr
      fresh = true
      update()
    }
  }

  const exec = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b
      case '-': return a - b
      case '*': return a * b
      case '/': return b === 0 ? NaN : a / b
      default: return b
    }
  }

  windowManager.open({ title: 'Калькулятор', icon: 'icon-file-exe', width: 250, height: 340, content: root, resizable: false })

  root.addEventListener('keydown', (e) => {
    const map: Record<string, string> = {
      'Enter': '=', 'Escape': 'C', 'Backspace': 'Back', 'Delete': 'CE',
    }
    if (map[e.key]) { handleKey(map[e.key]); e.preventDefault(); return }
    if ('0123456789.+-*/'.includes(e.key)) { handleKey(e.key); e.preventDefault() }
  })
  root.tabIndex = 0
  root.focus()
}

/* ═══════════════════════════════════════════════════════════════
   КОМАНДНАЯ СТРОКА
   ═══════════════════════════════════════════════════════════════ */

export function openCommandPrompt(): void {
  const root = document.createElement('div')
  root.className = 'cmd'
  const out = document.createElement('div')
  out.className = 'cmd__out'
  const line = document.createElement('div')
  line.className = 'cmd__line'
  line.innerHTML = `<span class="cmd__prompt">C:\\&gt;</span><input class="cmd__input xp-input" type="text" spellcheck="false" autocomplete="off" />`
  root.appendChild(out)
  root.appendChild(line)
  const input = line.querySelector('input')!
  const prompt = line.querySelector('.cmd__prompt')!
  let cwd = 'C:\\'
  const cmdHistory: string[] = []
  let histIdx = -1

  const writeln = (text: string) => {
    const row = document.createElement('div')
    row.textContent = text
    out.appendChild(row)
    out.scrollTop = out.scrollHeight
  }

  writeln('Microsoft Windows XP [Version 5.1.2600]')
  writeln('(C) Корпорация Майкрософт, 1985-2001.')
  writeln('')

  const resolvePath = (p: string): string => {
    const t = p.trim().replace(/\//g, '\\')
    if (t.match(/^[A-Za-z]:\\/)) return t
    if (t === '..') { const parts = cwd.replace(/\\$/, '').split('\\'); parts.pop(); return parts.join('\\') || 'C:\\' }
    return cwd.replace(/\\$/, '') + '\\' + t
  }

  const findFSNode = (path: string): FSNode | null => {
    const parts = path.replace(/\\$/, '').split('\\')
    let node: FSNode = FILE_SYSTEM
    for (let i = 1; i < parts.length; i++) {
      const child = node.children?.find((c: FSNode) => c.name.toLowerCase() === parts[i]!.toLowerCase())
      if (!child) return null
      node = child
    }
    return node
  }

  const run = (raw: string) => {
    const cmd = raw.trim()
    if (!cmd) return
    writeln(`${cwd}> ${cmd}`)
    const parts = cmd.split(/\s+/)
    const command = parts[0]!.toLowerCase()
    const args = parts.slice(1)

    if (command === 'cls') { out.innerHTML = ''; return }
    if (command === 'exit') { windowManager.close(winId); return }
    if (command === 'ver') { writeln(''); writeln('Microsoft Windows XP [Version 5.1.2600]'); return }
    if (command === 'date') { writeln(`Текущая дата: ${new Date().toLocaleDateString('ru-RU')}`); return }
    if (command === 'time') { writeln(`Текущее время: ${new Date().toLocaleTimeString('ru-RU')}`); return }
    if (command === 'echo') { writeln(args.join(' ')); return }
    if (command === 'set') {
      if (!args.length) {
        writeln('COMPUTERNAME=ПОЛЬЗОВАТЕЛЬ-ПК')
        writeln('OS=Windows_NT')
        writeln('PATH=C:\\WINDOWS\\system32;C:\\WINDOWS')
        writeln('PROMPT=$P$G')
        writeln('TEMP=C:\\WINDOWS\\TEMP')
      }
      return
    }
    if (command === 'help') {
      writeln('CLS      Очистка экрана')
      writeln('COPY     Копирование файлов')
      writeln('DATE     Дата')
      writeln('DEL      Удаление файлов')
      writeln('DIR      Список файлов')
      writeln('ECHO     Вывод текста')
      writeln('EXIT     Закрытие')
      writeln('HELP     Справка')
      writeln('MD       Создание папки')
      writeln('MKDIR    Создание папки')
      writeln('MOVE     Перемещение файлов')
      writeln('REN      Переименование')
      writeln('RENAME   Переименование')
      writeln('RMDIR    Удаление папки')
      writeln('SET      Переменные среды')
      writeln('TIME     Время')
      writeln('TYPE     Просмотр файла')
      writeln('VER      Версия Windows')
      return
    }
    if (command === 'cd' || command === 'chdir') {
      if (!args.length) { writeln(cwd); return }
      const target = args.join(' ')
      if (target === '\\' || target === '/') { cwd = 'C:\\'; prompt.textContent = `${cwd}>`; return }
      cwd = resolvePath(target)
      prompt.textContent = `${cwd}>`
      return
    }
    if (command === 'md' || command === 'mkdir') {
      if (!args.length) { writeln('Необходимо указать имя папки.'); return }
      writeln('') // success
      return
    }
    if (command === 'rmdir' || command === 'rmdir') {
      if (!args.length) { writeln('Необходимо указать имя папки.'); return }
      writeln('')
      return
    }
    if (command === 'ren' || command === 'rename') {
      if (args.length < 2) { writeln('Необходимо указать имя и новое имя.'); return }
      writeln('')
      return
    }
    if (command === 'copy') {
      if (args.length < 2) { writeln('Необходимо указать источник и назначение.'); return }
      writeln('        1 файл(ов) скопировано.')
      return
    }
    if (command === 'move') {
      if (args.length < 2) { writeln('Необходимо указать источник и назначение.'); return }
      writeln('        1 файл(ов) перемещено.')
      return
    }
    if (command === 'del' || command === 'erase') {
      if (!args.length) { writeln('Необходимо указать имя файла.'); return }
      writeln('')
      return
    }
    if (command === 'type') {
      if (!args.length) { writeln('Необходимо указать имя файла.'); return }
      const fileName = args[0]!.replace(/"/g, '')
      const fullPath = resolvePath(fileName)
      const node = findFSNode(fullPath)
      if (node && node.type === 'file' && node.content) { writeln(node.content) }
      else { writeln(`Файл не найден: ${fileName}`) }
      return
    }
    if (command === 'dir') {
      const targetPath = args.length ? resolvePath(args[0]!.replace(/"/g, '')) : cwd
      const node = findFSNode(targetPath)
      if (!node || node.type !== 'folder') { writeln(`Не удалось найти путь ${targetPath}`); return }
      writeln(` Том в диске C без метки`)
      writeln(` Серийный номер тома: 1A2B-3C4D`)
      writeln(` Содержимое папки ${targetPath}`)
      writeln('')
      let fileCount = 0
      let dirCount = 0
      for (const child of node.children ?? []) {
        if (child.type === 'folder') {
          dirCount++
          const mod = child.modified ?? '08.08.2004  14:00'
          writeln(`${mod}    <DIR>          ${child.name}`)
        } else {
          fileCount++
          const mod = child.modified ?? '08.08.2004  14:00'
          const size = (child.size ?? '0 КБ').padStart(14)
          writeln(`${mod}  ${size} ${child.name}`)
        }
      }
      writeln(`               ${fileCount} файл(ов)`)
      writeln(`               ${dirCount} папок`)
      return
    }
    if (command === 'start') {
      const prog = args.join(' ')
      import('./run').then(({ runProgram }) => {
        if (!runProgram(prog)) writeln('Не удается найти файл.')
      })
      return
    }
    writeln(`"${command}" не является внутренней или внешней командой`)
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      cmdHistory.push(input.value)
      histIdx = cmdHistory.length
      run(input.value)
      input.value = ''
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (histIdx > 0) { histIdx--; input.value = cmdHistory[histIdx]! }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx < cmdHistory.length - 1) { histIdx++; input.value = cmdHistory[histIdx]! }
      else { histIdx = cmdHistory.length; input.value = '' }
    }
    if (e.key === 'Tab') { e.preventDefault() }
  })

  const winId = windowManager.open({ title: 'Командная строка', icon: 'icon-file-exe', width: 640, height: 400, content: root })
  input.focus()
}

/* ═══════════════════════════════════════════════════════════════
   PAINT (jspaint)
   ═══════════════════════════════════════════════════════════════ */

export function openPaint(title = 'Безымянный - Paint', imageMediaUrl?: string): void {
  const root = document.createElement('div')
  root.className = 'paint'
  const iframe = document.createElement('iframe')
  iframe.className = 'paint__iframe'
  iframe.src = '/html/jspaint/index.html'
  iframe.setAttribute('frameborder', '0')
  root.appendChild(iframe)

  const loadImageIntoPaint = async () => {
    if (!imageMediaUrl) return
    try {
      const ed = iframe.contentWindow as any
      if (ed?.load_image_from_uri) {
        await ed.load_image_from_uri(imageMediaUrl)
      }
    } catch { /* silent */ }
  }

  iframe.addEventListener('load', () => {
    loadImageIntoPaint()
  })

  windowManager.open({
    title, icon: 'icon-file-jpg', width: 700, height: 540, content: root,
  })
}

/* ═══════════════════════════════════════════════════════════════
   САПЁР
   ═══════════════════════════════════════════════════════════════ */

const MINE_SVG = `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges"><g stroke="#000" stroke-width="1"><line x1="8" y1="1" x2="8" y2="15"/><line x1="1" y1="8" x2="15" y2="8"/><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/><line x1="4" y1="1" x2="12" y2="15"/><line x1="12" y1="1" x2="4" y2="15"/></g><circle cx="8" cy="8" r="4.5" fill="#000"/><rect x="6" y="6" width="3" height="3" fill="#f00"/></svg>`
const FLAG_SVG = `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges"><rect x="5" y="2" width="1" height="11" fill="#000"/><polygon points="6,2 13,4 13,8 6,10" fill="#f00"/><rect x="4" y="13" width="7" height="1" fill="#000"/></svg>`
const WRONG_FLAG_SVG = `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges"><rect x="5" y="2" width="1" height="11" fill="#000"/><polygon points="6,2 13,4 13,8 6,10" fill="#f00"/><rect x="4" y="13" width="7" height="1" fill="#000"/><line x1="3" y1="3" x2="13" y2="13" stroke="#000" stroke-width="2"/></svg>`

const FACE_SVG = {
  normal: `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges"><circle cx="8" cy="8" r="7" fill="#000"/><circle cx="8" cy="8" r="6" fill="#ff0"/><rect x="5" y="5" width="2" height="2" fill="#000"/><rect x="9" y="5" width="2" height="2" fill="#000"/><rect x="5" y="10" width="1" height="1" fill="#000"/><rect x="6" y="11" width="1" height="1" fill="#000"/><rect x="7" y="11" width="2" height="1" fill="#000"/><rect x="9" y="11" width="1" height="1" fill="#000"/><rect x="10" y="10" width="1" height="1" fill="#000"/></svg>`,
  ooh: `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges"><circle cx="8" cy="8" r="7" fill="#000"/><circle cx="8" cy="8" r="6" fill="#ff0"/><rect x="5" y="5" width="2" height="2" fill="#000"/><rect x="9" y="5" width="2" height="2" fill="#000"/><rect x="7" y="10" width="2" height="2" fill="#000"/></svg>`,
  dead: `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges"><circle cx="8" cy="8" r="7" fill="#000"/><circle cx="8" cy="8" r="6" fill="#ff0"/><line x1="5" y1="4" x2="7" y2="7" stroke="#000" stroke-width="1.5"/><line x1="7" y1="4" x2="5" y2="7" stroke="#000" stroke-width="1.5"/><line x1="9" y1="4" x2="11" y2="7" stroke="#000" stroke-width="1.5"/><line x1="11" y1="4" x2="9" y2="7" stroke="#000" stroke-width="1.5"/><rect x="5" y="10" width="6" height="1" fill="#000"/></svg>`,
  win: `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges"><circle cx="8" cy="8" r="7" fill="#000"/><circle cx="8" cy="8" r="6" fill="#ff0"/><rect x="4" y="6" width="8" height="2" fill="#000"/><rect x="5" y="10" width="1" height="1" fill="#000"/><rect x="6" y="11" width="1" height="1" fill="#000"/><rect x="7" y="11" width="2" height="1" fill="#000"/><rect x="9" y="11" width="1" height="1" fill="#000"/><rect x="10" y="10" width="1" height="1" fill="#000"/></svg>`,
} as const

const MINE_CELL = 16
const MINE_PAD = 6
const MINE_HEADER_H = 36

type MineDiff = { cols: number; rows: number; mines: number; label: string }

const MINE_DIFFS: Record<string, MineDiff> = {
  easy: { cols: 9, rows: 9, mines: 10, label: 'Новичок' },
  medium: { cols: 16, rows: 16, mines: 40, label: 'Любитель' },
  hard: { cols: 30, rows: 16, mines: 99, label: 'Профи' },
}

function mineContentSize(cols: number, rows: number): { w: number; h: number } {
  const boardW = cols * MINE_CELL + MINE_PAD * 2
  const boardH = rows * MINE_CELL + MINE_PAD * 2
  return {
    w: boardW + MINE_PAD * 2,
    h: MINE_HEADER_H + 6 + boardH + MINE_PAD * 2,
  }
}

export function openMinesweeper(): void {
  let diff: MineDiff = { ...MINE_DIFFS.easy! }

  const root = document.createElement('div')
  root.className = 'mine'

  let cells: { mine: boolean; open: boolean; flag: boolean; n: number; i: number }[] = []
  let gameOver = false
  let gameWon = false
  let started = false
  let timerInterval: ReturnType<typeof setInterval> | null = null
  let elapsed = 0
  let flagCount = 0
  let explodedIdx = -1
  let winId = ''

  const setFace = (kind: keyof typeof FACE_SVG) => { smiley.innerHTML = FACE_SVG[kind] }

  const syncWindowSize = () => {
    requestAnimationFrame(() => {
      const winEl = document.querySelector<HTMLElement>(`[data-win-id="${winId}"]`)
      if (!winEl) return
      const client = winEl.querySelector<HTMLElement>('[data-role="client"]')
      if (!client) return
      const chromeW = winEl.offsetWidth - client.clientWidth
      const chromeH = winEl.offsetHeight - client.clientHeight
      windowManager.setSize(winId, root.offsetWidth + chromeW, root.offsetHeight + chromeH)
    })
  }

  const applyDifficulty = (key: keyof typeof MINE_DIFFS) => {
    diff = { ...MINE_DIFFS[key]! }
    windowManager.setTitle(winId, `Сапёр - ${diff.label}`)
    initGame()
    syncWindowSize()
  }

  const header = document.createElement('div')
  header.className = 'mine__header'
  root.appendChild(header)

  const mineCounter = document.createElement('div')
  mineCounter.className = 'mine__led'
  mineCounter.textContent = String(diff.mines).padStart(3, '0')
  header.appendChild(mineCounter)

  const smiley = document.createElement('button')
  smiley.className = 'mine__smiley'
  smiley.type = 'button'
  setFace('normal')
  smiley.addEventListener('click', initGame)
  header.appendChild(smiley)

  const timer = document.createElement('div')
  timer.className = 'mine__led'
  timer.textContent = '000'
  header.appendChild(timer)

  const gridWrap = document.createElement('div')
  gridWrap.className = 'mine__grid-wrap'
  root.appendChild(gridWrap)

  const grid = document.createElement('div')
  grid.className = 'mine__grid'
  gridWrap.appendChild(grid)

  const syncGridLayout = () => {
    grid.style.width = `${diff.cols * MINE_CELL}px`
    grid.style.height = `${diff.rows * MINE_CELL}px`
    grid.style.gridTemplateColumns = `repeat(${diff.cols}, ${MINE_CELL}px)`
    grid.style.gridTemplateRows = `repeat(${diff.rows}, ${MINE_CELL}px)`
    header.style.width = `${diff.cols * MINE_CELL + MINE_PAD * 2}px`
  }
  syncGridLayout()

  const NUM_COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080']

  const neighbors = (x: number, y: number): number[] => {
    const ids: number[] = []
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const nx = x + dx, ny = y + dy
        if (nx >= 0 && ny >= 0 && nx < diff.cols && ny < diff.rows) ids.push(ny * diff.cols + nx)
      }
    }
    return ids
  }

  const startTimer = () => {
    if (timerInterval) return
    started = true
    timerInterval = setInterval(() => {
      elapsed = Math.min(elapsed + 1, 999)
      timer.textContent = String(elapsed).padStart(3, '0')
    }, 1000)
  }

  const stopTimer = () => { if (timerInterval) { clearInterval(timerInterval); timerInterval = null } }

  const resetFace = () => {
    if (!gameOver && !gameWon) setFace('normal')
  }

  const render = () => {
    mineCounter.textContent = String(Math.max(0, diff.mines - flagCount)).padStart(3, '0')
    syncGridLayout()
    grid.innerHTML = cells.map((cell, idx) => {
      if (gameOver && cell.flag && !cell.mine) {
        return `<div class="mine__cell mine__cell--open mine__cell--wrong" data-i="${idx}">${WRONG_FLAG_SVG}</div>`
      }
      if (cell.open) {
        if (cell.mine) {
          const boom = idx === explodedIdx ? ' mine__cell--boom' : ''
          return `<div class="mine__cell mine__cell--open${boom}" data-i="${idx}">${MINE_SVG}</div>`
        }
        if (cell.n) return `<div class="mine__cell mine__cell--open" data-i="${idx}" style="color:${NUM_COLORS[cell.n]}">${cell.n}</div>`
        return `<div class="mine__cell mine__cell--open" data-i="${idx}"></div>`
      }
      if (cell.flag) return `<div class="mine__cell mine__cell--flagged" data-i="${idx}">${FLAG_SVG}</div>`
      return `<div class="mine__cell" data-i="${idx}"></div>`
    }).join('')

    grid.querySelectorAll<HTMLElement>('.mine__cell').forEach((el) => {
      const idx = Number(el.dataset.i)
      const closed = !cells[idx].open && !cells[idx].flag
      el.addEventListener('click', () => { if (!gameOver && !gameWon) reveal(idx) })
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        if (gameOver || gameWon || cells[idx].open) return
        if (!started) startTimer()
        cells[idx].flag = !cells[idx].flag
        flagCount += cells[idx].flag ? 1 : -1
        render()
      })
      if (closed) {
        el.addEventListener('mousedown', (e) => {
          if (e.button !== 0 || gameOver || gameWon) return
          setFace('ooh')
          el.classList.add('mine__cell--pressed')
        })
        el.addEventListener('mouseup', () => {
          el.classList.remove('mine__cell--pressed')
          resetFace()
        })
        el.addEventListener('mouseleave', () => {
          el.classList.remove('mine__cell--pressed')
          resetFace()
        })
      }
    })
  }

  const reveal = (idx: number) => {
    const cell = cells[idx]
    if (cell.open || cell.flag) return
    if (!started) startTimer()
    cell.open = true
    if (cell.mine) {
      gameOver = true
      explodedIdx = idx
      stopTimer()
      setFace('dead')
      cells.forEach((c) => { if (c.mine) c.open = true })
      render()
      return
    }
    if (!cell.n) neighbors(idx % diff.cols, Math.floor(idx / diff.cols)).forEach((n) => reveal(n))
    render()
    if (cells.every((c) => c.mine || c.open)) {
      gameWon = true
      stopTimer()
      setFace('win')
      render()
    }
  }

  function initGame() {
    stopTimer()
    gameOver = false; gameWon = false; started = false; elapsed = 0; flagCount = 0; explodedIdx = -1
    timer.textContent = '000'
    setFace('normal')
    cells = Array.from({ length: diff.cols * diff.rows }, (_, i) => ({ mine: false, open: false, flag: false, n: 0, i }))
    const indices = Array.from({ length: diff.cols * diff.rows }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]] }
    for (let i = 0; i < diff.mines; i++) cells[indices[i]!]!.mine = true
    for (const cell of cells) {
      if (cell.mine) continue
      const x = cell.i % diff.cols, y = Math.floor(cell.i / diff.cols)
      cell.n = neighbors(x, y).filter((n) => cells[n].mine).length
    }
    render()
  }

  const contentSize = mineContentSize(diff.cols, diff.rows)
  initGame()
  winId = windowManager.open({
    title: `Сапёр - ${diff.label}`,
    icon: 'icon-file-exe',
    width: contentSize.w + 16,
    height: contentSize.h + 46,
    content: root,
    resizable: false,
    menu: () => [{
      label: '&Игра',
      items: [
        { label: '&Новая', shortcut: 'F2', action: initGame },
        { separator: true },
        { label: '&Новичок', checked: diff.label === 'Новичок', action: () => applyDifficulty('easy') },
        { label: '&Любитель', checked: diff.label === 'Любитель', action: () => applyDifficulty('medium') },
        { label: '&Профи', checked: diff.label === 'Профи', action: () => applyDifficulty('hard') },
      ],
    }],
  })
  syncWindowSize()
}

/* ═══════════════════════════════════════════════════════════════
   ОБЩИЕ
   ═══════════════════════════════════════════════════════════════ */

export function openAppShell(title: string, icon: string, message: string): void {
  const root = document.createElement('div')
  root.className = 'appshell'
  root.innerHTML = `<div class="appshell__body">${message}</div>`
  windowManager.open({ title, icon, width: 520, height: 360, content: root })
}

export function openOutlookExpress(): void {
  const root = document.createElement('div')
  root.className = 'appshell appshell--outlook'
  root.innerHTML = `
    <div class="outlook__toolbar">Входящие</div>
    <div class="outlook__list">
      <div class="outlook__row outlook__row--unread">
        <span class="outlook__from">support@vertix-bot.ru</span>
        <span class="outlook__subject">Re: длинное видео</span>
      </div>
    </div>
    <div class="outlook__preview">
      <div class="outlook__preview-head">Re: длинное видео</div>
      <div class="outlook__preview-body">Может, нарежем на короткие клипы? Один файл — несколько готовых роликов.</div>
    </div>
  `
  windowManager.open({ title: 'Outlook Express', icon: 'icon-outlook', width: 560, height: 380, content: root })
}
