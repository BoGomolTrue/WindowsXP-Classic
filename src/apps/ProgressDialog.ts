import { windowManager } from '../windows/WindowManager'

export function showProgressDialog(title: string, message: string): void {
  const root = document.createElement('div')
  root.className = 'progressdlg'
  root.innerHTML = `
    <div class="progressdlg__msg">${message}</div>
    <div class="progressdlg__bar"><div class="progressdlg__fill"></div></div>
  `
  const fill = root.querySelector<HTMLElement>('.progressdlg__fill')!
  const winId = windowManager.open({
    title,
    icon: 'icon-drive',
    dialog: true,
    width: 360,
    height: 120,
    content: root,
  })

  let progress = 0
  const timer = window.setInterval(() => {
    progress += 8 + Math.random() * 12
    fill.style.width = `${Math.min(100, progress)}%`
    if (progress >= 100) {
      window.clearInterval(timer)
      window.setTimeout(() => windowManager.close(winId), 400)
    }
  }, 200)
}
