import { escapeHtml, icon } from '../utils/helpers'
import { windowManager } from '../windows/WindowManager'

export type MessageBoxIcon = 'info' | 'warning' | 'error' | 'question'
export type MessageBoxButtons = 'ok' | 'okcancel' | 'yesno' | 'yesnocancel'

const ICONS: Record<MessageBoxIcon, string> = {
  info: 'msg-info',
  warning: 'msg-warning',
  error: 'msg-error',
  question: 'msg-question',
}

const BUTTONS: Record<MessageBoxButtons, Array<{ value: string; label: string }>> = {
  ok: [{ value: 'ok', label: 'OK' }],
  okcancel: [
    { value: 'ok', label: 'OK' },
    { value: 'cancel', label: 'Отмена' },
  ],
  yesno: [
    { value: 'yes', label: 'Да' },
    { value: 'no', label: 'Нет' },
  ],
  yesnocancel: [
    { value: 'yes', label: 'Да' },
    { value: 'no', label: 'Нет' },
    { value: 'cancel', label: 'Отмена' },
  ],
}

export function showMessage(
  message: string,
  title = 'Windows',
  kind: MessageBoxIcon = 'info',
  buttons: MessageBoxButtons = 'ok',
): Promise<string> {
  return new Promise((resolve) => {
    const el = document.createElement('div')
    el.className = 'dialog msgbox'

    const btns = BUTTONS[buttons]
    el.innerHTML = `
      <div class="msgbox__body">
        ${icon(ICONS[kind], 32, 'msgbox__icon')}
        <div class="msgbox__text">${escapeHtml(message).replace(/\n/g, '<br>')}</div>
      </div>
      <div class="dialog__buttons">
        ${btns.map((b, i) => `<button class="xp-btn${i === 0 ? ' xp-btn--default' : ''}" type="button" data-value="${b.value}">${b.label}</button>`).join('')}
      </div>
    `

    // Ширина подбирается по самой длинной строке — как у настоящего MessageBox
    const longest = message.split('\n').reduce((m, l) => Math.max(m, l.length), 0)
    const width = Math.min(460, Math.max(240, Math.round(longest * 5.9) + 96))

    let settled = false
    const finish = (value: string) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const winId = windowManager.open({
      title,
      icon: 'icon-computer',
      dialog: true,
      width,
      height: 160,
      content: el,
      onClose: () => finish('cancel'),
    })

    el.querySelectorAll<HTMLElement>('.xp-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        finish(btn.dataset.value!)
        windowManager.close(winId)
      })
    })

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') (el.querySelector('.xp-btn') as HTMLElement)?.click()
      if (e.key === 'Escape') {
        finish('cancel')
        windowManager.close(winId)
      }
    })

    requestAnimationFrame(() => {
      const body = el.querySelector<HTMLElement>('.msgbox__body')!
      const row = el.querySelector<HTMLElement>('.dialog__buttons')!
      const height = 3 * 2 + 18 + 20 + body.offsetHeight + 12 + row.offsetHeight
      windowManager.setSize(winId, undefined, height, true)
      ;(el.querySelector('.xp-btn') as HTMLElement)?.focus()
    })
  })
}
