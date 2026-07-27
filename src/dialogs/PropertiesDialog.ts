import { escapeHtml, formatDateTime, icon } from '../utils/helpers'
import { windowManager } from '../windows/WindowManager'

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

  const activeIndex = opts.type === 'display' ? 3 : 0

  el.innerHTML = `
    <div class="xp-tabs">
      <div class="xp-tabs__strip">
        ${tabs.map((t, i) => `<div class="xp-tabs__tab${i === activeIndex ? ' xp-tabs__tab--active' : ''}">${t}</div>`).join('')}
      </div>
      <div class="xp-tabs__page">
        ${opts.type === 'display' ? displayPage() : filePage(opts)}
      </div>
    </div>
    <div class="dialog__buttons dialog__buttons--right">
      <button class="xp-btn xp-btn--default" type="button" data-role="ok">OK</button>
      <button class="xp-btn" type="button" data-role="cancel">Отмена</button>
      <button class="xp-btn" type="button" data-role="apply" disabled>Применить</button>
    </div>
  `

  const winId = windowManager.open({
    title: `Свойства: ${opts.name}`,
    icon: opts.type === 'display' ? 'icon-showdesktop' : 'icon-folder',
    dialog: true,
    width: opts.type === 'display' ? 400 : 358,
    height: opts.type === 'display' ? 452 : 400,
    content: el,
  })

  el.querySelectorAll<HTMLElement>('[data-role]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.role !== 'apply') windowManager.close(winId)
    })
  })

  requestAnimationFrame(() => windowManager.setSize(winId, undefined, undefined, true))
}

function filePage(opts: PropertiesOptions): string {
  const isFolder = opts.type === 'folder'
  const now = formatDateTime(new Date())
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

function displayPage(): string {
  return `
    <div class="props__preview">
      <div class="props__preview-screen">
        <div class="props__preview-win">
          <div class="props__preview-caption">Активное окно</div>
          <div class="props__preview-menu">Файл&nbsp;&nbsp;Правка&nbsp;&nbsp;Вид</div>
          <div class="props__preview-body"><span class="props__preview-btn">OK</span></div>
        </div>
      </div>
    </div>
    <div style="padding-top:10px">
      <div style="padding-bottom:2px">Окна и кнопки:</div>
      <div class="combo" style="height:21px">
        <span class="combo__text" style="padding-left:4px">Классический стиль</span>
        <button class="combo__btn" type="button"></button>
      </div>
      <div style="padding:8px 0 2px">Цветовая схема:</div>
      <div class="combo" style="height:21px">
        <span class="combo__text" style="padding-left:4px">Стандартная (Windows)</span>
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
