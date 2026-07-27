import { windowManager } from '../windows/WindowManager'

interface PropsOptions {
  name: string
  type: string
}

export function showProperties(opts: PropsOptions): void {
  const el = document.createElement('div')
  el.className = 'dialog properties-dialog'

  const now = new Date()
  const dateStr = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

  el.innerHTML = `
    <div class="properties-dialog__tabs">
      <div class="properties-dialog__tab properties-dialog__tab--active">Общие</div>
      <div class="properties-dialog__tab">Содержимое</div>
      <div class="properties-dialog__tab">Настройка</div>
    </div>
    <div class="properties-dialog__body">
      <div class="properties-dialog__header">
        <div class="properties-dialog__icon">
          <svg width="32" height="32" viewBox="0 0 32 32">
            <rect x="2" y="4" width="28" height="18" fill="#c0c0c0" stroke="#000"/>
            <rect x="4" y="6" width="24" height="14" fill="#008080"/>
            <rect x="13" y="22" width="6" height="2" fill="#808080"/>
            <rect x="10" y="24" width="12" height="3" fill="#c0c0c0" stroke="#000"/>
          </svg>
        </div>
        <div class="properties-dialog__name">${escapeHtml(opts.name)}</div>
      </div>
      <div class="properties-dialog__sep"></div>
      <table class="properties-dialog__table">
        <tr>
          <td>Тип:</td>
          <td>${opts.type === 'folder' ? 'Папка' : 'Файл'}</td>
        </tr>
        <tr>
          <td>Расположение:</td>
          <td>C:\\</td>
        </tr>
        <tr>
          <td>Размер:</td>
          <td>${opts.type === 'folder' ? '128 КБ' : '4 КБ'}</td>
        </tr>
        <tr>
          <td>Создан:</td>
          <td>${dateStr}</td>
        </tr>
        <tr>
          <td>Изменён:</td>
          <td>${dateStr}</td>
        </tr>
        <tr>
          <td>Атрибуты:</td>
          <td>
            <label class="properties-dialog__attr"><input type="checkbox" checked disabled /> Только для чтения</label>
            <label class="properties-dialog__attr"><input type="checkbox" /> Скрытый</label>
            <label class="properties-dialog__attr"><input type="checkbox" /> Системный</label>
          </td>
        </tr>
      </table>
    </div>
    <div class="properties-dialog__buttons">
      <button class="xp-btn" data-role="ok">OK</button>
      <button class="xp-btn" data-role="cancel">Отмена</button>
      <button class="xp-btn" data-role="apply">Применить</button>
    </div>
  `

  const winId = windowManager.open({
    title: `Свойства: ${opts.name}`,
    icon: 'icon-computer',
    width: 380,
    height: 360,
    x: Math.floor(window.innerWidth / 2 - 190),
    y: Math.floor(window.innerHeight / 2 - 190),
    resizable: false,
    minimizable: false,
    maximizable: false,
    content: el,
  })

  el.querySelectorAll('[data-role]').forEach((btn) => {
    btn.addEventListener('click', () => {
      windowManager.close(winId)
    })
  })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
