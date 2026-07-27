import { escapeHtml } from '../utils/helpers'
import { windowManager } from '../windows/WindowManager'

const FAKE_PROCESSES = [
  { name: 'System', cpu: '0', mem: '236 K' },
  { name: 'smss.exe', cpu: '0', mem: '412 K' },
  { name: 'csrss.exe', cpu: '0', mem: '4 096 K' },
  { name: 'explorer.exe', cpu: '0', mem: '8 192 K' },
  { name: 'ffmpeg.exe', cpu: '48', mem: '128 000 K' },
  { name: 'svchost.exe', cpu: '2', mem: '12 288 K' },
  { name: 'iexplore.exe', cpu: '1', mem: '16 384 K' },
]

export function openTaskManager(): void {
  const root = document.createElement('div')
  root.className = 'taskmgr'
  let tab: 'apps' | 'proc' = 'apps'

  function render(): void {
    const wins = windowManager.getWindows()
    root.innerHTML = `
      <div class="taskmgr__tabs">
        <span class="taskmgr__tab${tab === 'apps' ? ' taskmgr__tab--active' : ''}" data-tab="apps">Приложения</span>
        <span class="taskmgr__tab${tab === 'proc' ? ' taskmgr__tab--active' : ''}" data-tab="proc">Процессы</span>
        <span class="taskmgr__tab">Производительность</span>
      </div>
      <div class="taskmgr__list">
        ${tab === 'apps' ? wins.map((w) => `
          <div class="taskmgr__row" data-win="${w.id}">
            ${w.options.icon ? `<svg width="16" height="16"><use href="#${w.options.icon}"/></svg>` : ''}
            <span>${escapeHtml(w.options.title)}</span>
            <span class="taskmgr__state">${w.minimized ? 'Не отвечает' : 'Выполняется'}</span>
          </div>`).join('') : FAKE_PROCESSES.map((p) => `
          <div class="taskmgr__row taskmgr__row--proc">
            <span>${escapeHtml(p.name)}</span>
            <span class="taskmgr__state">${p.cpu} %</span>
            <span class="taskmgr__state">${p.mem}</span>
          </div>`).join('')}
      </div>
      <div class="taskmgr__btns">
        <button class="xp-btn" type="button" data-action="end" disabled>Завершить задачу</button>
        <button class="xp-btn" type="button" data-action="switch" disabled>Переключиться</button>
      </div>
    `

    root.querySelectorAll<HTMLElement>('.taskmgr__tab[data-tab]').forEach((tabEl) => {
      tabEl.addEventListener('click', () => {
        tab = tabEl.dataset.tab as 'apps' | 'proc'
        render()
      })
    })

    if (tab !== 'apps') return

    let selected: string | null = null
    root.querySelectorAll<HTMLElement>('.taskmgr__row[data-win]').forEach((row) => {
      row.addEventListener('click', () => {
        selected = row.dataset.win!
        root.querySelectorAll('.taskmgr__row').forEach((r) => r.classList.remove('selected'))
        row.classList.add('selected')
        root.querySelector<HTMLButtonElement>('[data-action="end"]')!.disabled = false
        root.querySelector<HTMLButtonElement>('[data-action="switch"]')!.disabled = false
      })
      row.addEventListener('dblclick', () => {
        const id = row.dataset.win!
        windowManager.restore(id)
        windowManager.focus(id)
      })
    })

    root.querySelector('[data-action="end"]')?.addEventListener('click', () => {
      if (selected) { windowManager.close(selected); render() }
    })
    root.querySelector('[data-action="switch"]')?.addEventListener('click', () => {
      if (selected) { windowManager.restore(selected); windowManager.focus(selected) }
    })
  }

  render()
  const timer = window.setInterval(render, 1000)
  windowManager.open({
    title: 'Диспетчер задач Windows',
    icon: 'icon-computer',
    width: 420,
    height: 360,
    content: root,
    onClose: () => window.clearInterval(timer),
  })
}
