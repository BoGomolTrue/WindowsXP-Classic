import { windowManager } from '../windows/WindowManager'

export type MessageBoxIcon = 'info' | 'warning' | 'error' | 'question'
export type MessageBoxButton = 'ok' | 'okcancel' | 'yesno'

export function showMessage(
  message: string,
  title: string = 'Сообщение',
  icon: MessageBoxIcon = 'info',
  buttons: MessageBoxButtons = 'ok',
): Promise<string> {
  return new Promise((resolve) => {
    const el = document.createElement('div')
    el.className = 'dialog messagebox'

    const iconSvg = getIconSvg(icon)
    const btns = getButtons(buttons)

    el.innerHTML = `
      <div class="messagebox__body">
        <div class="messagebox__icon">${iconSvg}</div>
        <div class="messagebox__text">${escapeHtml(message).replace(/\n/g, '<br>')}</div>
      </div>
      <div class="messagebox__buttons">
        ${btns.map((b) => `<button class="xp-btn messagebox__btn" data-value="${b.value}">${b.label}</button>`).join('')}
      </div>
    `

    const winId = windowManager.open({
      title,
      icon: 'icon-computer',
      width: 380,
      height: 180,
      x: Math.floor(window.innerWidth / 2 - 190),
      y: Math.floor(window.innerHeight / 2 - 120),
      resizable: false,
      minimizable: false,
      maximizable: false,
      content: el,
      onClose: () => resolve('close'),
    })

    el.querySelectorAll('.messagebox__btn').forEach((btn) => {
      (btn as HTMLElement).focus()
      btn.addEventListener('click', () => {
        resolve((btn as HTMLElement).dataset.value ?? 'ok')
        windowManager.close(winId)
      })
    })

    const firstBtn = el.querySelector('.messagebox__btn') as HTMLElement
    if (firstBtn) firstBtn.focus()
  })
}

function getIconSvg(icon: MessageBoxIcon): string {
  switch (icon) {
    case 'info':
      return `<svg width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="#316ac5" stroke="#000"/>
        <text x="16" y="23" text-anchor="middle" font-size="20" font-weight="bold" fill="#fff" font-family="Arial">i</text>
      </svg>`
    case 'warning':
      return `<svg width="32" height="32" viewBox="0 0 32 32">
        <polygon points="16,2 30,28 2,28" fill="#ffcc00" stroke="#000"/>
        <text x="16" y="25" text-anchor="middle" font-size="20" font-weight="bold" fill="#000" font-family="Arial">!</text>
      </svg>`
    case 'error':
      return `<svg width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="#cc0000" stroke="#000"/>
        <line x1="10" y1="10" x2="22" y2="22" stroke="#fff" stroke-width="3"/>
        <line x1="22" y1="10" x2="10" y2="22" stroke="#fff" stroke-width="3"/>
      </svg>`
    case 'question':
      return `<svg width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="#316ac5" stroke="#000"/>
        <text x="16" y="23" text-anchor="middle" font-size="22" font-weight="bold" fill="#fff" font-family="Arial">?</text>
      </svg>`
  }
}

interface BtnDef {
  value: string
  label: string
}

function getButtons(type: MessageBoxButtons): BtnDef[] {
  switch (type) {
    case 'ok':
      return [{ value: 'ok', label: 'OK' }]
    case 'okcancel':
      return [
        { value: 'ok', label: 'OK' },
        { value: 'cancel', label: 'Отмена' },
      ]
    case 'yesno':
      return [
        { value: 'yes', label: 'Да' },
        { value: 'no', label: 'Нет' },
      ]
  }
}

type MessageBoxButtons = 'ok' | 'okcancel' | 'yesno'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
