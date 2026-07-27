import { showMessage } from '../dialogs/MessageBox'
import { showPrompt } from '../dialogs/PromptDialog'
import { showProperties } from '../dialogs/PropertiesDialog'
import { windowManager, type WindowMenu } from './WindowManager'
import { ABOUT_EASTER_HTML } from '../data/easter-eggs'
import { addFavorite, loadFavorites } from '../data/favorites'

const DEFAULT_HOME = (import.meta.env.VITE_IE_HOME_URL as string | undefined)?.trim() || 'https://vertix-bot.ru'
const XP_ICON = (file: string, size = 25) => `<img src="/images/xp/icons/${file}" width="${size}" height="${size}" alt="">`

function normalizeUrl(raw: string): string | null {
  const input = raw.trim()
  if (!input) return null
  if (input === 'about:blank') return input
  if (input.toLowerCase() === 'about:easter') return 'about:easter'
  if (/^https?:\/\//i.test(input)) return input
  if (/^[\w.-]+\.[a-z]{2,}/i.test(input)) return `https://${input}`
  return null
}

function titleForUrl(url: string): string {
  try {
    return `${new URL(url).hostname} — Internet Explorer`
  } catch {
    return 'Microsoft Internet Explorer'
  }
}

export function openInternetExplorer(startUrl?: string): void {
  const root = document.createElement('div')
  root.className = 'ie'

  root.innerHTML = `
    <div class="explorer__rebar" data-role="rebar">
      <div class="explorer__band explorer__band--toolbar">
        <div class="toolbar" data-role="toolbar">
          <button class="toolbar__rbtn" type="button" data-action="back" title="Назад">${XP_ICON('Back.png')}</button>
          <button class="toolbar__rbtn" type="button" data-action="forward" title="Вперёд">${XP_ICON('Forward.png')}</button>
          <button class="toolbar__rbtn" type="button" data-action="stop" title="Стоп">${XP_ICON('IEStop.png')}</button>
          <button class="toolbar__rbtn" type="button" data-action="refresh" title="Обновить">${XP_ICON('IERefresh.png')}</button>
          <button class="toolbar__rbtn" type="button" data-action="home" title="Домашняя страница">${XP_ICON('IEHome.png')}</button>
          <span class="toolbar__sep"></span>
          <button class="toolbar__rbtn" type="button" data-action="search" title="Поиск">${XP_ICON('Search.png')}</button>
          <button class="toolbar__rbtn" type="button" data-action="favorites" title="Избранное">${XP_ICON('Favorites.png')}</button>
          <button class="toolbar__rbtn" type="button" data-action="history" title="Журнал">${XP_ICON('IEHistory.png')}</button>
          <span class="toolbar__sep"></span>
          <button class="toolbar__rbtn" type="button" data-action="mail" title="Почта">${XP_ICON('Email.png')}</button>
          <button class="toolbar__rbtn" type="button" data-action="fax" title="Факс">${XP_ICON('Fax.png')}</button>
          <button class="toolbar__rbtn" type="button" data-action="messenger" title="Windows Messenger">${XP_ICON('WindowsMessenger.png')}</button>
        </div>
      </div>
      <div class="explorer__band explorer__band--address">
        <div class="explorer__address">
          <span class="explorer__address-label">Адрес</span>
          <div class="explorer__address-field">
            <span class="explorer__address-icon ie__url-icon"></span>
            <input class="explorer__address-input" type="text" data-role="address" spellcheck="false" autocomplete="off" />
          </div>
          <button class="explorer__go-btn" type="button" data-action="go" title="Переход"></button>
        </div>
      </div>
    </div>
    <div class="ie__frame-wrap" data-role="frame-wrap">
      <iframe class="ie__frame" data-role="frame" title="Страница" referrerpolicy="no-referrer"></iframe>
      <div class="ie__blocked hidden" data-role="blocked">
        <p><b>Internet Explorer</b> не может открыть эту страницу.</p>
        <p>Некоторые сайты запрещают показ во встроенном окне. Попробуйте другой адрес или откройте сайт в обычном браузере.</p>
      </div>
    </div>
    <div class="statusbar" data-role="statusbar">
      <div class="statusbar__pane statusbar__pane--grow ie__status-left" data-role="status-main">
        ${XP_ICON('URL.png', 15)}
        <div class="ie__progress hidden" data-role="progress"><div class="ie__progress-fill" data-role="progress-fill"></div></div>
        <span data-role="status-text">Готово</span>
      </div>
      <div class="statusbar__pane ie__status-right">
        ${XP_ICON('InternetShortcut.png', 15)}
        <span>Интернет</span>
      </div>
    </div>
  `

  const frame = root.querySelector<HTMLIFrameElement>('[data-role="frame"]')!
  const addressInput = root.querySelector<HTMLInputElement>('[data-role="address"]')!
  const statusText = root.querySelector('[data-role="status-text"]')!
  const progressEl = root.querySelector('[data-role="progress"]')!
  const progressFill = root.querySelector<HTMLElement>('[data-role="progress-fill"]')!
  const blockedEl = root.querySelector('[data-role="blocked"]')!
  const rebarEl = root.querySelector('[data-role="rebar"]')!
  const statusEl = root.querySelector('[data-role="statusbar"]')!

  let toolbarVisible = true
  let addressVisible = true
  let statusVisible = true
  let progressTimer = 0

  const history: string[] = []
  let historyIndex = -1
  let currentUrl = ''
  let loading = false

  const el = (action: string) => root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!

  function setLoading(next: boolean): void {
    loading = next
    el('stop').disabled = !loading
    el('refresh').disabled = loading
    progressEl.classList.toggle('hidden', !loading)
    statusText.classList.toggle('hidden', loading)
    statusText.textContent = 'Готово'
    if (progressTimer) {
      window.clearInterval(progressTimer)
      progressTimer = 0
    }
    if (loading) {
      progressFill.style.width = `${50 + Math.floor(Math.random() * 30)}%`
      progressTimer = window.setInterval(() => {
        const w = parseFloat(progressFill.style.width || '50')
        progressFill.style.width = `${Math.min(92, w + Math.random() * 6)}%`
      }, 220)
    } else {
      progressFill.style.width = '100%'
    }
  }

  function setNavButtons(): void {
    el('back').disabled = historyIndex <= 0
    el('forward').disabled = historyIndex >= history.length - 1
  }

  function showBlocked(show: boolean): void {
    blockedEl.classList.toggle('hidden', !show)
    frame.classList.toggle('hidden', show)
  }

  function applyLocalPage(html = '<!DOCTYPE html><html><body style="margin:0;background:#fff"></body></html>'): void {
    showBlocked(false)
    frame.removeAttribute('src')
    frame.srcdoc = html
  }

  function navigate(raw: string, pushHistory = true): void {
    const url = normalizeUrl(raw)
    if (!url) {
      showMessage('Адрес указан неверно.', 'Internet Explorer', 'error')
      return
    }

    currentUrl = url
    addressInput.value = url
    windowManager.setTitle(winId, titleForUrl(url))
    setLoading(true)
    showBlocked(false)

    if (url === 'about:blank') {
      applyLocalPage()
      setLoading(false)
    } else if (url === 'about:easter') {
      applyLocalPage(ABOUT_EASTER_HTML)
      windowManager.setTitle(winId, 'Справка — Internet Explorer')
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

  function toggleChrome(): void {
    rebarEl.querySelector('.explorer__band--toolbar')!.classList.toggle('hidden', !toolbarVisible)
    rebarEl.querySelector('.explorer__band--address')!.classList.toggle('hidden', !addressVisible)
    rebarEl.classList.toggle('hidden', !toolbarVisible && !addressVisible)
    statusEl.classList.toggle('hidden', !statusVisible)
  }

  function ieMenuBar(closeWin: () => void): WindowMenu[] {
    return [
      {
        label: '&Файл',
        items: [
          {
            label: 'Созд&ать',
            items: [
              {
                label: 'Страницу',
                action: () => applyLocalPage('<!DOCTYPE html><html><body contenteditable="true" style="margin:8px;font:12px Tahoma"></body></html>'),
              },
              { label: 'Окно', action: () => openInternetExplorer(currentUrl || DEFAULT_HOME) },
            ],
          },
          {
            label: 'От&крыть...',
            action: () => {
              void showPrompt('Введите адрес:', 'Internet Explorer', currentUrl).then((url) => {
                if (url) navigate(url)
              })
            },
          },
          { separator: true },
          { label: 'З&акрыть', action: closeWin },
        ],
      },
      {
        label: '&Правка',
        items: [
          {
            label: 'Копировать',
            action: () => {
              try { document.execCommand('copy') } catch { showMessage('Команда недоступна для этой страницы.', 'Internet Explorer', 'info') }
            },
          },
          {
            label: 'Выделить все',
            action: () => {
              try { frame.contentWindow?.document.execCommand('selectAll') } catch { showMessage('Команда недоступна для этой страницы.', 'Internet Explorer', 'info') }
            },
          },
          {
            label: 'Найти на этой странице...',
            action: () => {
              void showPrompt('Найти:', 'Internet Explorer').then((q) => {
                if (!q) return
                try { (frame.contentWindow as Window & { find?: (s: string) => boolean }).find?.(q) } catch { showMessage('Поиск недоступен для этой страницы.', 'Internet Explorer', 'info') }
              })
            },
          },
        ],
      },
      {
        label: '&Вид',
        items: [
          { label: 'Панель инструментов', checked: toolbarVisible, action: () => { toolbarVisible = !toolbarVisible; toggleChrome() } },
          { label: 'Строка адреса', checked: addressVisible, action: () => { addressVisible = !addressVisible; toggleChrome() } },
          { label: 'Строка состояния', checked: statusVisible, action: () => { statusVisible = !statusVisible; toggleChrome() } },
          { separator: true },
          { label: 'Обновить', action: refresh },
        ],
      },
      {
        label: 'Из&бранное',
        items: [
          {
            label: 'Добавить на панель избранного...',
            action: () => {
              addFavorite(titleForUrl(currentUrl || DEFAULT_HOME), currentUrl || DEFAULT_HOME)
              showMessage('Добавлено в избранное.', 'Internet Explorer', 'info')
            },
          },
          { label: 'Домашняя страница', action: home },
          { separator: true },
          ...loadFavorites().map((fav) => ({
            label: fav.title,
            action: () => navigate(fav.url),
          })),
        ],
      },
      {
        label: '&Сервис',
        items: [
          {
            label: 'Свойства обозревателя',
            action: () => showProperties({ name: 'Internet Explorer', type: 'folder' }),
          },
          { label: 'Параметры Windows Update', action: () => navigate('https://vertix-bot.ru') },
        ],
      },
      {
        label: '&Справка',
        items: [
          { label: 'Содержание и указатель', action: () => navigate('https://vertix-bot.ru') },
          { label: 'О программе Internet Explorer', action: () => showMessage('Microsoft Internet Explorer 6.0', 'Internet Explorer', 'info') },
        ],
      },
    ]
  }

  const winId = windowManager.open({
    title: 'Microsoft Internet Explorer',
    icon: 'InternetExplorer6.png',
    width: 860,
    height: 620,
    menu: () => ieMenuBar(() => windowManager.close(winId)),
    content: root,
    onClose: () => {
      if (progressTimer) window.clearInterval(progressTimer)
    },
  })

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')
    if (!btn || (btn as HTMLButtonElement).disabled) return
    switch (btn.dataset.action) {
      case 'back': back(); break
      case 'forward': forward(); break
      case 'stop': stop(); break
      case 'refresh': refresh(); break
      case 'home': home(); break
      case 'go': navigate(addressInput.value); break
      case 'search':
        addressInput.focus()
        addressInput.select()
        break
      case 'favorites':
        showMessage('Избранное пока пусто.', 'Internet Explorer', 'info')
        break
      case 'history':
        showMessage('Журнал посещений пуст.', 'Internet Explorer', 'info')
        break
      case 'mail':
      case 'fax':
      case 'messenger':
        showMessage('Служба недоступна в этой версии Windows.', 'Internet Explorer', 'info')
        break
    }
  })

  addressInput.addEventListener('click', () => addressInput.select())
  addressInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigate(addressInput.value)
  })

  frame.addEventListener('load', () => {
    setLoading(false)
    if (currentUrl === 'about:blank') return

    try {
      const doc = frame.contentDocument
      if (doc) {
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
        return
      }

      try {
        const href = frame.contentWindow?.location.href ?? ''
        if (href === 'about:blank' || href === '') {
          showBlocked(true)
          return
        }
      } catch {
        showBlocked(false)
        return
      }

      showBlocked(false)
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
