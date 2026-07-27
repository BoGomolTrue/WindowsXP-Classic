import { USER_NAME } from '../data/icons'
import { icon } from '../utils/helpers'
import { windowManager } from '../windows/WindowManager'

export function showAbout(): void {
  const el = document.createElement('div')
  el.className = 'dialog about'

  el.innerHTML = `
    <div class="about__top">
      ${icon('icon-xp-logo', 48, 'about__logo')}
      <div>
        <div class="about__title">Microsoft<sup>®</sup> Windows<sup>®</sup></div>
        <div class="about__line">Версия 5.1 (Сборка 2600.xpsp_sp3_gdr.101209-1647 : Service Pack 3)</div>
        <div class="about__line">Copyright © 1981—2001 Microsoft Corporation</div>
      </div>
    </div>
    <div class="xp-sep"></div>
    <div class="about__line">
      Данный продукт защищён законом об авторском праве и международными соглашениями.
    </div>
    <div class="about__line" style="padding-top:8px">Этот продукт предоставлен по лицензии:</div>
    <div class="about__line" style="padding-left:12px">${USER_NAME}</div>
    <div class="about__line" style="padding-left:12px">Домашний компьютер</div>
    <div class="about__line" style="padding-top:8px">
      Физическая память, доступная Windows:&nbsp;&nbsp;1 048 048 КБ
    </div>
    <div class="about__spacer"></div>
    <div class="dialog__buttons dialog__buttons--right">
      <button class="xp-btn xp-btn--default" type="button" data-role="ok">OK</button>
    </div>
  `

  const winId = windowManager.open({
    title: 'О программе Windows',
    icon: 'icon-computer',
    dialog: true,
    width: 424,
    height: 272,
    content: el,
  })

  el.querySelector('[data-role="ok"]')!.addEventListener('click', () => windowManager.close(winId))
  requestAnimationFrame(() => {
    windowManager.setSize(winId, undefined, undefined, true)
    ;(el.querySelector('.xp-btn') as HTMLElement)?.focus()
  })
}
