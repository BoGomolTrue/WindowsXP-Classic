import { windowManager } from './WindowManager'
import { showMessage } from '../dialogs/MessageBox'
import { showPrompt } from '../dialogs/PromptDialog'
import { compressItem, extractArchive } from '../data/archive-service'

function showArchiveProgress(
  title: string,
  message: string,
  task: () => Promise<void>,
  onDone?: () => void,
  onError?: (err: Error) => Promise<boolean>,
): void {
  const root = document.createElement('div')
  root.className = 'winrar-dlg'
  root.innerHTML = `
    <p class="winrar-dlg__msg">${message}</p>
    <div class="winrar-dlg__bar"><div class="winrar-dlg__fill"></div></div>
    <div class="winrar-dlg__actions">
      <button type="button" class="xp-btn" data-act="cancel">Отмена</button>
    </div>
  `

  const fill = root.querySelector<HTMLElement>('.winrar-dlg__fill')!
  let cancelled = false
  let timer = 0

  const winId = windowManager.open({
    title,
    icon: 'RAR.png',
    dialog: true,
    width: 280,
    height: 220,
    resizable: false,
    content: root,
    onClose: () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
    },
  })

  timer = window.setInterval(() => {
    const w = parseFloat(fill.style.width || '0')
    fill.style.width = `${Math.min(95, w + 4 + Math.random() * 8)}%`
  }, 180)

  root.querySelector('[data-act="cancel"]')!.addEventListener('click', () => windowManager.close(winId))

  void task()
    .then(() => {
      if (cancelled) return
      fill.style.width = '100%'
      window.setTimeout(() => {
        windowManager.close(winId)
        onDone?.()
      }, 250)
    })
    .catch(async (err: Error) => {
      if (cancelled) return
      windowManager.close(winId)
      if (timer) window.clearInterval(timer)
      if (onError && await onError(err)) return
      void showMessage(err.message || 'Не удалось обработать архив.', 'WinRAR', 'error')
    })
    .finally(() => {
      if (timer) window.clearInterval(timer)
    })
}

export function compressArchiveItem(parentPath: string, name: string, onDone?: () => void): void {
  showArchiveProgress(
    'Сжатие',
    `Сжатие ${name}...`,
    async () => {
      await compressItem(parentPath, name)
    },
    onDone,
  )
}

export function extractArchiveItem(parentPath: string, name: string, password?: string, onDone?: () => void): void {
  showArchiveProgress(
    'WinRAR',
    `Извлечение ${name}...`,
    async () => {
      await extractArchive(parentPath, name, password)
    },
    onDone,
    async (err) => {
      if (err.message !== 'ENCRYPTED') return false
      const pwd = await showPrompt('Введите пароль:', 'WinRAR', '', 'RAR.png')
      if (!pwd) return true
      extractArchiveItem(parentPath, name, pwd, onDone)
      return true
    },
  )
}
