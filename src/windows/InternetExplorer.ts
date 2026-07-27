import { icon } from '../utils/helpers'
import { showMessage } from '../dialogs/MessageBox'
import { windowManager, type WindowMenu } from './WindowManager'

const DEFAULT_HOME = (import.meta.env.VITE_IE_HOME_URL as string | undefined)?.trim() || 'about:home'

const WELCOME_HTML = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Домашняя страница</title><style>
body{margin:0;padding:16px 20px;font:11px Tahoma,Verdana,sans-serif;background:#fff;color:#000}
h1{font-size:16px;margin:0 0 12px}
p{margin:0 0 10px;line-height:1.45}
a{color:#00c}
ul{margin:8px 0 0;padding-left:18px}
</style></head><body>
<h1>Добро пожаловать в Internet Explorer</h1>
<p>Введите адрес в строке выше или выберите ссылку:</p>
<ul>
<li><a href="https://example.com/">example.com</a></li>
<li><a href="https://ru.wikipedia.org/">Википедия</a></li>
<li><a href="https://archive.org/">Internet Archive</a></li>
</ul>
<p>Не все сайты откроются в окне — многие запрещают встраивание в iframe.</p>
</body></html>`

function normalizeUrl(raw: string): string | null {
  const input = raw.trim()
  if (!input) return null
  if (input === 'about:home' || input === 'about:blank') return input
  if (/^https?:\/\//i.test(input)) return input
  if (/^[\w.-]+\.[a-z]{2,}/i.test(input)) return `https://${input}`
  return null
}

function titleForUrl(url: string): string {
  if (url === 'about:home') return 'Домашняя страница — Internet Explorer'
  try {
    return `${new URL(url).hostname} — Internet Explorer`
  } catch {
    return 'Internet Explorer'
  }
}

function ieMenuBar(home: () => void, refresh: () => void, closeWin: () => void): WindowMenu[] {
  return [
    {
      label: '&Файл',
      items: [
        { label: 'Созд&ать', items: [{ label: 'Страницу', disabled: true }, { label: 'Окно', disabled: true }] },
        { label: 'От&крыть...', disabled: true },
        { separator: true },
        { label: 'З&акрыть', action: closeWin },
      ],
    },
    {
      label: '&Правка',
      items: [
        { label: 'Копировать', disabled: true },
        { label: 'Выделить все', disabled: true },
        { label: 'Найти на этой странице...', disabled: true },
      ],
    },
    {
      label: '&Вид',
      items: [
        { label: 'Панель инструментов', checked: true, disabled: true },
        { label: 'Строка адреса', checked: true, disabled: true },
        { label: 'Строка состояния', checked: true, disabled: true },
        { separator: true },
        { label: 'Обновить', action: refresh },
      ],
    },
    {
      label: 'Из&бранное',
      items: [
        { label: 'Добавить на панель избранного...', disabled: true },
        { label: 'Домашняя страница', action: home },
      ],
    },
    {
      label: '&Сервис',
      items: [
        { label: 'Свойства обозревателя', disabled: true },
        { label: 'Параметры Windows Update', disabled: true },
      ],
    },
    {
      label: '&Справка',
      items: [
        { label: 'Содержание и указатель', disabled: true },
        { label: 'О программе Internet Explorer', action: () => showMessage('Microsoft Internet Explorer 6.0', 'Internet Explorer', 'info') },
      ],
    },
  ]
}

export function openInternetExplorer(startUrl?: string): void {
  const root = document.createElement('div')
  root.className = 'ie'

  root.innerHTML = `
    <div class="ie__toolbar toolbar" data-role="toolbar">
      <button class="toolbar__btn" type="button" data-action="back" title="Назад">${icon('tb-back', 16)}</button>
      <button class="toolbar__btn" type="button" data-action="forward" title="Вперед">${icon('tb-forward', 16)}</button>
      <button class="toolbar__btn" type="button" data-action="stop" title="Стоп">${icon('tb-stop', 16)}</button>
      <button class="toolbar__btn" type="button" data-action="refresh" title="Обновить">${icon('tb-refresh', 16)}</button>
      <button class="toolbar__btn" type="button" data-action="home" title="Домашняя страница">${icon('tb-home', 16)}</button>
    </div>
    <div class="ie__address explorer__address">
      <span class="explorer__address-label">Адрес</span>
      <div class="combo ie__combo">
        <input class="combo__input" type="text" data-role="address" spellcheck="false" autocomplete="off" />
        <button class="toolbar__btn" type="button" data-action="go">${icon('tb-go', 16)}Переход</button>
      </div>
    </div>
    <div class="ie__frame-wrap" data-role="frame-wrap">
      <iframe class="ie__frame" data-role="frame" title="Страница" referrerpolicy="no-referrer"></iframe>
      <div class="ie__blocked hidden" data-role="blocked">
        <p><b>Internet Explorer</b> не может открыть эту страницу.</p>
        <p>Некоторые сайты запрещают показ во встроенном окне. Попробуйте другой адрес или откройте сайт в обычном браузере.</p>
      </div>
    </div>
    <div class="statusbar ie__status">
      <div class="statusbar__pane statusbar__pane--grow" data-role="status-main">Готово</div>
      <div class="statusbar__pane" data-role="status-zone">${icon('icon-tray-network', 16)}<span>Интернет</span></div>
    </div>
  `

  const frame = root.querySelector<HTMLIFrameElement>('[data-role="frame"]')!
  const addressInput = root.querySelector<HTMLInputElement>('[data-role="address"]')!
  const statusMain = root.querySelector('[data-role="status-main"]')!
  const blockedEl = root.querySelector('[data-role="blocked"]')!

  const history: string[] = []
  let historyIndex = -1
  let currentUrl = ''
  let loading = false

  const el = (action: string) => root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!

  function setLoading(next: boolean): void {
    loading = next
    el('stop').disabled = !loading
    el('refresh').disabled = loading
    statusMain.textContent = loading ? 'Загрузка...' : 'Готово'
  }

  function setNavButtons(): void {
    el('back').disabled = historyIndex <= 0
    el('forward').disabled = historyIndex >= history.length - 1
  }

  function showBlocked(show: boolean): void {
    blockedEl.classList.toggle('hidden', !show)
    frame.classList.toggle('hidden', show)
  }

  function applyLocalPage(url: string): void {
    showBlocked(false)
    frame.removeAttribute('src')
    if (url === 'about:blank') {
      frame.srcdoc = '<!DOCTYPE html><html><body style="margin:0;background:#fff"></body></html>'
      return
    }
    frame.srcdoc = WELCOME_HTML
  }

  function navigate(raw: string, pushHistory = true): void {
    const url = normalizeUrl(raw)
    if (!url) {
      showMessage('Адрес указан неверно.', 'Internet Explorer', 'error')
      return
    }

    currentUrl = url
    addressInput.value = url === 'about:home' ? DEFAULT_HOME : url
    windowManager.setTitle(winId, titleForUrl(url))
    setLoading(true)
    showBlocked(false)

    if (url === 'about:home' || url === 'about:blank') {
      applyLocalPage(url)
      setLoading(false)
    } else {
      frame.removeAttribute('srcdoc')
      frame.src = url
    }

    if (pushHistory) {
      history.splice(historyIndex + 1)
      history.push(url)
      historyIndex = history.length - 1
    }
    setNavButtons()
  }

  function back(): void {
    if (historyIndex <= 0) return
    historyIndex--
    navigate(history[historyIndex], false)
  }

  function forward(): void {
    if (historyIndex >= history.length - 1) return
    historyIndex++
    navigate(history[historyIndex], false)
  }

  function refresh(): void {
    if (!currentUrl) return
    navigate(currentUrl, false)
  }

  function home(): void {
    navigate(DEFAULT_HOME)
  }

  function stop(): void {
    if (!loading) return
    setLoading(false)
    try {
      frame.contentWindow?.stop()
    } catch {
      frame.src = 'about:blank'
    }
  }

  const winId = windowManager.open({
    title: 'Internet Explorer',
    icon: 'icon-ie',
    width: 860,
    height: 620,
    menu: () => ieMenuBar(home, refresh, () => windowManager.close(winId)),
    content: root,
  })

  root.querySelector('[data-role="toolbar"]')!.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')
    if (!btn || (btn as HTMLButtonElement).disabled) return
    switch (btn.dataset.action) {
      case 'back': back(); break
      case 'forward': forward(); break
      case 'stop': stop(); break
      case 'refresh': refresh(); break
      case 'home': home(); break
      case 'go': navigate(addressInput.value); break
    }
  })

  addressInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigate(addressInput.value)
  })

  frame.addEventListener('load', () => {
    setLoading(false)
    if (currentUrl === 'about:home' || currentUrl === 'about:blank') return

    try {
      const doc = frame.contentDocument
      if (!doc) {
        showBlocked(true)
        return
      }
      const href = frame.contentWindow?.location.href ?? ''
      if (href === 'about:blank' && currentUrl.startsWith('http')) {
        showBlocked(true)
        return
      }
      showBlocked(false)
      if (href.startsWith('http')) {
        currentUrl = href
        addressInput.value = href
        windowManager.setTitle(winId, titleForUrl(href))
      }
    } catch {
      showBlocked(false)
    }
  })

  frame.addEventListener('error', () => {
    setLoading(false)
    showBlocked(true)
  })

  navigate(startUrl ?? DEFAULT_HOME)
}
