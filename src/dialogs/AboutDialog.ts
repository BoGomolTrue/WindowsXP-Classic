import { windowManager } from '../windows/WindowManager'

export function showAbout(): void {
  const el = document.createElement('div')
  el.className = 'dialog about-dialog'

  el.innerHTML = `
    <div class="about-dialog__top">
      <div class="about-dialog__logo">
        <svg width="48" height="48" viewBox="0 0 48 48">
          <rect x="4" y="4" width="18" height="18" rx="2" fill="#ff0000" opacity="0.9"/>
          <rect x="26" y="4" width="18" height="18" rx="2" fill="#00a000" opacity="0.9"/>
          <rect x="4" y="26" width="18" height="18" rx="2" fill="#0000ff" opacity="0.9"/>
          <rect x="26" y="26" width="18" height="18" rx="2" fill="#ffcc00" opacity="0.9"/>
        </svg>
      </div>
      <div class="about-dialog__info">
        <div class="about-dialog__title">Microsoft<sup>®</sup> Windows<sup>®</sup> XP</div>
        <div class="about-dialog__version">Версия 5.1 (Сбор 2600.xpsp_sp2_rtm.040803-2158 : Service Pack 2)</div>
        <div class="about-dialog__copyright">Copyright © 1981-2001 Microsoft Corporation</div>
      </div>
    </div>
    <div class="about-dialog__sep"></div>
    <div class="about-dialog__detail">
      <table class="about-dialog__table">
        <tr><td>Операционная система:</td><td>Microsoft Windows XP Professional</td></tr>
        <tr><td>Версия:</td><td>5.1.2600 Сбор 2600.xpsp_sp2_rtm.040803-2158</td></tr>
        <tr><td>Регистрация:</td><td>Пользователь</td></tr>
        <tr><td>Системная память:</td><td>1 024 МБ ОЗУ</td></tr>
      </table>
    </div>
    <div class="about-dialog__buttons">
      <button class="xp-btn about-dialog__ok" data-role="close">OK</button>
    </div>
  `

  const winId = windowManager.open({
    title: 'О системе',
    icon: 'icon-computer',
    width: 440,
    height: 330,
    x: Math.floor(window.innerWidth / 2 - 220),
    y: Math.floor(window.innerHeight / 2 - 180),
    resizable: false,
    minimizable: false,
    maximizable: false,
    content: el,
  })

  el.querySelector('.about-dialog__ok')!.addEventListener('click', () => {
    windowManager.close(winId)
  })
}
