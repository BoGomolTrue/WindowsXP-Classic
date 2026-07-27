import { escapeHtml } from '../utils/helpers'
import { windowManager } from '../windows/WindowManager'

export function showPrompt(
  message: string,
  title = 'Windows',
  defaultValue = '',
  iconId = 'icon-folder-open',
): Promise<string | null> {
  return new Promise((resolve) => {
    const el = document.createElement('div')
    el.className = 'dialog promptbox'

    el.innerHTML = `
      <div class="promptbox__body">
        <label class="promptbox__label">${escapeHtml(message)}</label>
        <input class="promptbox__input xp-input" type="text" spellcheck="false" value="${escapeHtml(defaultValue)}" />
      </div>
      <div class="dialog__buttons dialog__buttons--right">
        <button class="xp-btn xp-btn--default" type="button" data-value="ok">OK</button>
        <button class="xp-btn" type="button" data-value="cancel">Отмена</button>
      </div>
    `

    const longest = message.split('\n').reduce((m, l) => Math.max(m, l.length), 0)
    const width = Math.min(420, Math.max(300, Math.round(longest * 5.5) + 48))
    let settled = false
    const finish = (value: string | null) => {
      if (settled) return
      settled = true
      windowManager.close(winId)
      resolve(value)
    }

    const input = el.querySelector<HTMLInputElement>('.promptbox__input')!
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(input.value.trim() || null)
      if (e.key === 'Escape') finish(null)
    })

    el.querySelectorAll<HTMLButtonElement>('[data-value]').forEach((btn) => {
      btn.addEventListener('click', () => {
        finish(btn.dataset.value === 'ok' ? input.value.trim() || null : null)
      })
    })

    const winId = windowManager.open({
      title,
      icon: iconId,
      dialog: true,
      width,
      height: 160,
      content: el,
      onClose: () => finish(null),
    })

    requestAnimationFrame(() => {
      const body = el.querySelector<HTMLElement>('.promptbox__body')!
      const row = el.querySelector<HTMLElement>('.dialog__buttons')!
      const height = 3 * 2 + 28 + body.offsetHeight + 12 + row.offsetHeight + 10
      windowManager.setSize(winId, undefined, height, true)
      input.focus()
      input.select()
    })
  })
}
