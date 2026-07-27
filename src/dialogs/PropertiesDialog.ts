import { escapeHtml, icon } from '../utils/helpers'
import { windowManager } from '../windows/WindowManager'
import {
  WALLPAPERS,
  getWallpaperId,
  getWallpaperUrl,
  setWallpaper,
  type WallpaperId,
} from '../data/wallpaper'

export interface PropertiesOptions {
  name: string
  type: 'folder' | 'file' | 'display'
}

export function showProperties(opts: PropertiesOptions): void {
  const el = document.createElement('div')
  el.className = 'dialog props'

  const tabs = opts.type === 'display'
    ? ['Темы', 'Рабочий стол', 'Заставка', 'Оформление', 'Параметры']
    : ['Общие', 'Доступ', 'Настройка']

  const activeIndex = opts.type === 'display' ? 1 : 0

  el.innerHTML = `
    <div class="xp-tabs${opts.type === 'display' ? ' xp-tabs--display' : ''}">
      <div class="xp-tabs__strip">
        ${tabs.map((t, i) => `<div class="xp-tabs__tab${i === activeIndex ? ' xp-tabs__tab--active' : ''}" data-tab="${i}">${t}</div>`).join('')}
      </div>
      <div class="xp-tabs__page" id="tab-page">
        ${opts.type === 'display' ? desktopTabContent() : filePage(opts)}
      </div>
    </div>
    <div class="dialog__buttons dialog__buttons--right">
      <button class="xp-btn xp-btn--default" type="button" data-role="ok">OK</button>
      <button class="xp-btn" type="button" data-role="cancel">Отмена</button>
      ${opts.type === 'display' ? '<button class="xp-btn" type="button" data-role="apply" disabled>Применить</button>' : ''}
    </div>
  `

  const tabPage = el.querySelector('#tab-page') as HTMLElement
  let selectedWallpaper = getWallpaperId()
  let appliedWallpaper = getWallpaperId()

  const syncApplyButton = () => {
    const applyBtn = el.querySelector<HTMLButtonElement>('[data-role="apply"]')
    if (applyBtn) applyBtn.disabled = selectedWallpaper === appliedWallpaper
  }

  const updatePreview = (id: WallpaperId) => {
    const preview = el.querySelector<HTMLElement>('[data-role="wp-preview"]')
    if (preview) preview.style.backgroundImage = `url("${getWallpaperUrl(id)}")`
  }

  function bindDesktopTab(): void {
    updatePreview(selectedWallpaper)
    el.querySelectorAll<HTMLElement>('.props__wp-item').forEach((item) => {
      item.addEventListener('click', () => {
        selectedWallpaper = item.dataset.wp as WallpaperId
        el.querySelectorAll('.props__wp-item').forEach((node) => {
          node.classList.toggle('props__wp-item--selected', (node as HTMLElement).dataset.wp === selectedWallpaper)
        })
        updatePreview(selectedWallpaper)
        syncApplyButton()
      })
    })
  }

  el.querySelectorAll<HTMLElement>('.xp-tabs__tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const index = Number(tab.dataset.tab)
      el.querySelectorAll('.xp-tabs__tab').forEach((node, i) => {
        node.classList.toggle('xp-tabs__tab--active', i === index)
      })
      if (opts.type === 'display') {
        switch (index) {
          case 0: tabPage.innerHTML = themesTabContent(); break
          case 1: tabPage.innerHTML = desktopTabContent(); bindDesktopTab(); syncApplyButton(); break
          case 2: tabPage.innerHTML = screensaverTabContent(); break
          case 3: tabPage.innerHTML = displayPage(); break
          case 4: tabPage.innerHTML = settingsTabContent(); break
        }
      }
    })
  })

  if (opts.type === 'display') bindDesktopTab()

  el.querySelectorAll<HTMLElement>('[data-role]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.role === 'apply') {
        setWallpaper(selectedWallpaper)
        appliedWallpaper = selectedWallpaper
        syncApplyButton()
      } else if (btn.dataset.role === 'ok') {
        setWallpaper(selectedWallpaper)
        windowManager.close(winId)
      } else {
        windowManager.close(winId)
      }
    })
  })

  const winId = windowManager.open({
    title: opts.type === 'display' ? 'Свойства: Экран' : `Свойства: ${opts.name}`,
    icon: opts.type === 'display' ? 'icon-showdesktop' : 'icon-folder',
    dialog: true,
    width: opts.type === 'display' ? 400 : 358,
    height: opts.type === 'display' ? 570 : 400,
    content: el,
  })

  requestAnimationFrame(() => windowManager.setSize(winId, undefined, undefined, true))
}

function filePage(opts: PropertiesOptions): string {
  const isFolder = opts.type === 'folder'
  const now = new Date().toLocaleString('ru-RU')
  return `
    <div class="props__header">
      ${icon(isFolder ? 'icon-folder' : 'icon-file', 32)}
      <input class="xp-input" style="flex:1" type="text" value="${escapeHtml(opts.name)}" readonly />
    </div>
    <div class="xp-sep"></div>
    <table class="props__table">
      <tr><td>Тип:</td><td>${isFolder ? 'Папка с файлами' : 'Файл'}</td></tr>
      <tr><td>Расположение:</td><td>C:\\Documents and Settings\\Пользователь</td></tr>
      <tr><td>Размер:</td><td>${isFolder ? '128 КБ (131 072 байт)' : '4,00 КБ (4 096 байт)'}</td></tr>
      <tr><td>На диске:</td><td>${isFolder ? '132 КБ (135 168 байт)' : '8,00 КБ (8 192 байт)'}</td></tr>
    </table>
    <div class="xp-sep"></div>
    <table class="props__table">
      ${isFolder ? '<tr><td>Содержит:</td><td>файлов: 3; папок: 2</td></tr>' : ''}
      <tr><td>Создан:</td><td>${now}</td></tr>
      <tr><td>Изменён:</td><td>${now}</td></tr>
      <tr><td>Открыт:</td><td>${now}</td></tr>
    </table>
    <div class="xp-sep"></div>
    <table class="props__table">
      <tr>
        <td>Атрибуты:</td>
        <td>
          <div class="props__attrs">
            <label class="xp-check"><input type="checkbox" /> Только чтение</label>
            <label class="xp-check"><input type="checkbox" /> Скрытый</label>
          </div>
        </td>
      </tr>
    </table>
  `
}

function desktopTabContent(): string {
  const current = getWallpaperId()
  return `
    <div class="props__desktop">
      <div class="props__monitor-area">
        <div class="props__monitor">
          <div class="props__monitor-screen" data-role="wp-preview" style="background-image:url('${getWallpaperUrl(current)}')"></div>
          <div class="props__monitor-frame"></div>
        </div>
      </div>
      <div class="props__wp-list-wrap">
        <div class="props__wp-list-label">Фоновый рисунок:</div>
        <div class="props__wp-list">
          ${WALLPAPERS.map((wp) => `
            <button class="props__wp-item${wp.id === current ? ' props__wp-item--selected' : ''}" type="button" data-wp="${wp.id}">
              <img src="/images/xp/icons/JPG.png" width="20" height="20" alt="">
              <span>${escapeHtml(wp.label)}.jpg</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `
}

function themesTabContent(): string {
  return `
    <div style="padding:8px 0;line-height:1.5">
      <div style="font-size:12px;font-weight:bold;margin-bottom:8px">Схемы оформления</div>
      <div class="combo" style="height:21px;width:100%">
        <span class="combo__text" style="padding-left:4px">Windows XP</span>
        <button class="combo__btn" type="button"></button>
      </div>
      <div style="padding:12px 0;color:#808080">
        Выберите тему для оформления рабочего стола, окон и кнопок.
      </div>
    </div>
  `
}

function screensaverTabContent(): string {
  return `
    <div style="padding:8px 0">
      <div class="props__preview" style="height:100px;background:#000;display:flex;align-items:center;justify-content:center">
        <span style="color:#fff;font-size:11px">Нет заставки</span>
      </div>
      <div style="padding:8px 0 2px">Заставка:</div>
      <div class="combo" style="height:21px;width:100%">
        <span class="combo__text" style="padding-left:4px">(Нет)</span>
        <button class="combo__btn" type="button"></button>
      </div>
      <div style="padding:8px 0">
        <label class="xp-check"><input type="checkbox" /> Ожидание:</label>
        <span style="padding-left:4px">15 мин.</span>
      </div>
      <div style="padding:4px 0">
        <label class="xp-check"><input type="checkbox" /> Восстановить паролем</label>
      </div>
    </div>
  `
}

function displayPage(): string {
  return `
    <div style="padding:8px 0;line-height:1.5">
      <div style="padding-bottom:2px">Окна и кнопки:</div>
      <div class="combo" style="height:21px">
        <span class="combo__text" style="padding-left:4px">Windows XP style</span>
        <button class="combo__btn" type="button"></button>
      </div>
      <div style="padding:8px 0 2px">Цветовая схема:</div>
      <div class="combo" style="height:21px">
        <span class="combo__text" style="padding-left:4px">Синяя (по умолчанию)</span>
        <button class="combo__btn" type="button"></button>
      </div>
      <div style="padding:8px 0 2px">Размер шрифта:</div>
      <div class="combo" style="height:21px">
        <span class="combo__text" style="padding-left:4px">Обычный</span>
        <button class="combo__btn" type="button"></button>
      </div>
    </div>
  `
}

function settingsTabContent(): string {
  return `
    <div style="padding:8px 0;line-height:1.5">
      <div style="font-size:11px;color:#808080">
        Разрешение экрана: ${window.innerWidth} x ${window.innerHeight}
      </div>
      <div style="padding:8px 0">Качество цвета:</div>
      <div class="combo" style="height:21px;width:100%">
        <span class="combo__text" style="padding-left:4px">Настоящий цвет (32 бита)</span>
        <button class="combo__btn" type="button"></button>
      </div>
    </div>
  `
}
