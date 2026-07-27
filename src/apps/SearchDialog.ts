import { escapeHtml } from '../utils/helpers'
import { searchFilesystem } from '../data/filesystem-store'
import { windowManager } from '../windows/WindowManager'
import { openExplorer } from '../windows/Explorer'

export function openSearchDialog(): void {
  const root = document.createElement('div')
  root.className = 'searchdlg'
  root.innerHTML = `
    <label class="searchdlg__label">Искать файлы и папки с именем:</label>
    <input class="searchdlg__input xp-input" type="text" />
    <div class="searchdlg__results"></div>
    <div class="dialog__buttons dialog__buttons--right">
      <button class="xp-btn xp-btn--default" type="button" data-action="search">Искать</button>
      <button class="xp-btn" type="button" data-action="stop">Стоп</button>
      <button class="xp-btn" type="button" data-action="close">Закрыть</button>
    </div>
  `

  const input = root.querySelector<HTMLInputElement>('.searchdlg__input')!
  const results = root.querySelector<HTMLDivElement>('.searchdlg__results')!

  const runSearch = () => {
    const q = input.value.trim()
    if (!q) {
      results.innerHTML = '<div class="searchdlg__hint">Введите имя файла или часть имени.</div>'
      return
    }
    const found = searchFilesystem(q)
    if (!found.length) {
      results.innerHTML = '<div class="searchdlg__hint">Ничего не найдено.</div>'
      return
    }
    results.innerHTML = found.slice(0, 40).map(({ path, node }) =>
      `<button class="searchdlg__item" type="button" data-path="${escapeHtml(path)}">${escapeHtml(node.name)} <span>${escapeHtml(path)}</span></button>`,
    ).join('')
    results.querySelectorAll<HTMLButtonElement>('.searchdlg__item').forEach((btn) => {
      btn.addEventListener('click', () => {
        openExplorer(btn.dataset.path!)
        windowManager.close(winId)
      })
    })
  }

  root.querySelector('[data-action="search"]')?.addEventListener('click', runSearch)
  root.querySelector('[data-action="stop"]')?.addEventListener('click', () => { results.innerHTML = '' })
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch() })

  const winId = windowManager.open({
    title: 'Результаты поиска',
    icon: 'icon-find',
    dialog: true,
    width: 460,
    height: 360,
    content: root,
  })
  root.querySelector('[data-action="close"]')?.addEventListener('click', () => windowManager.close(winId))
  input.focus()
}
