import { preloadSounds } from '../utils/sounds'
import '../styles/boot.css'

const MEM_TOTAL = 524288

const BIOS_PROCESSOR = 'Main Processor : Potato(R) Core(TM) i0-000 @ 0.00GHz'
const BIOS_COPROCESSOR = 'Math CoProcessor : Not installed (calculator.exe recommended)'
const BIOS_DRIVES = [
  'IDE Channel 0 Device 0 : VERTIX-SSD-9000 &nbsp;&nbsp;512GB &nbsp;Ultra DMA Mode-∞',
  'IDE Channel 0 Device 1 : SAMSUNG SP0421N &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;40GB &nbsp;(full of memes)',
  'IDE Channel 1 Device 0 : DVD-RW &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;«disc 2 of 1»',
  'IDE Channel 1 Device 1 : None &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(thank god)',
]
const BIOS_DMI = [
  'Verifying DMI Pool Data ......',
  'ACPI: Vertix Power Management Controller v1.0',
  'OEM Product: win.vertix-bot.ru',
  'Boot from Hard Disk...',
]

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function fadeOut(el: HTMLElement, ms = 400): Promise<void> {
  return new Promise((resolve) => {
    el.classList.add('boot-fade-out')
    setTimeout(() => {
      el.remove()
      resolve()
    }, ms)
  })
}

async function runBiosPost(): Promise<void> {
  const el = document.createElement('section')
  el.className = 'bios-screen'
  el.id = 'bios'

  let memCount = 0
  let memDone = false
  let drivesVisible = false
  let dmiVisible = false

  const render = () => {
    el.innerHTML = `
      <p>Award Modular BIOS v6.00PG, An Energy Star Ally</p>
      <p>Copyright (C) 1984-2003, Award Software, Inc.</p>
      <br>
      <p>ASUS P4S800-MX ACPI BIOS Revision 1008</p>
      <p>Copyright (C) 2003, ASUSTeK COMPUTER INC.</p>
      <br>
      <p>${BIOS_PROCESSOR}</p>
      <p>Memory Testing : ${memCount.toLocaleString()}K${memDone ? ' OK' : ''}${memDone ? ' &nbsp;(640K was enough, right?)' : ''}</p>
      ${memDone ? `<p>${BIOS_COPROCESSOR}</p>` : ''}
      ${drivesVisible ? `
        <br>
        ${BIOS_DRIVES.map((line) => `<p>${line}</p>`).join('')}
      ` : ''}
      ${dmiVisible ? `
        <br>
        ${BIOS_DMI.map((line) => `<p>${line}</p>`).join('')}
      ` : ''}
    `
  }

  document.body.appendChild(el)
  render()

  const skip = (): Promise<void> =>
    new Promise((resolve) => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          document.removeEventListener('keydown', onKey)
          resolve()
        }
      }
      document.addEventListener('keydown', onKey)
    })

  const postStart = Date.now()
  const postDuration = 1400
  await Promise.race([
    new Promise<void>((resolve) => {
      const step = () => {
        const t = Math.min((Date.now() - postStart) / postDuration, 1)
        memCount = Math.floor(t * MEM_TOTAL)
        if (t < 1) {
          render()
          requestAnimationFrame(step)
        } else {
          memCount = MEM_TOTAL
          memDone = true
          render()
          setTimeout(() => { drivesVisible = true; render() }, 300)
          setTimeout(() => { dmiVisible = true; render() }, 900)
          setTimeout(resolve, 1600)
        }
      }
      requestAnimationFrame(step)
    }),
    skip(),
  ])

  await sleep(400)
  await fadeOut(el)
}

async function runXpStarting(): Promise<void> {
  void preloadSounds()

  const el = document.createElement('div')
  el.className = 'xp-starting'
  el.innerHTML = `
    <div class="xp-starting__center">
      <img src="/images/xp_loading_logo.jpg" alt="" width="400">
      <div class="xp-loader">
        <div></div><div></div><div></div>
      </div>
    </div>
    <div class="xp-starting__copy">
      <p>Copyright © Microsoft Corporation</p>
      <p class="xp-starting__vertix">Vertix edition · win.vertix-bot.ru</p>
    </div>
    <div class="xp-starting__ms"><img src="/images/xp_loading_mslogo.jpg" width="120" alt=""></div>
  `
  document.body.appendChild(el)

  await sleep(3000)
  await fadeOut(el, 500)
}

export function showWelcomeOverlay(): Promise<void> {
  return new Promise((resolve) => {
    const el = document.createElement('div')
    el.className = 'xp-welcome'
    el.innerHTML = `
      <div class="xp-welcome__top"></div>
      <div class="xp-welcome__line"></div>
      <div class="xp-welcome__body"><span>Добро пожаловать</span></div>
      <div class="xp-welcome__line2"></div>
      <div class="xp-welcome__bottom"></div>
    `
    document.body.appendChild(el)

    let done = false
    const finish = () => {
      if (done) return
      done = true
      el.classList.add('boot-fade-out')
      setTimeout(() => {
        el.remove()
        resolve()
      }, 400)
    }

    const audio = new Audio('/audio/xp_startup.mp3')
    audio.addEventListener('ended', finish)
    audio.addEventListener('error', finish)
    audio.addEventListener('canplaythrough', () => {
      audio.play().catch(finish)
    }, { once: true })
    audio.load()

    setTimeout(finish, 7000)
  })
}

export async function runBootSequence(): Promise<void> {
  const hidePosLoader = document.getElementById('pos_loader')
  if (hidePosLoader) hidePosLoader.style.display = 'none'

  await runBiosPost()
  await runXpStarting()
}
