import { windowManager } from './WindowManager'
import { openExplorer } from './Explorer'
import { PATH_MY_MUSIC } from '../data/filesystem'

export interface MediaPlayerOptions {
  title?: string
  mediaUrl?: string
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function openMediaPlayer(opts: MediaPlayerOptions = {}): void {
  const root = document.createElement('div')
  root.className = 'mpc'

  const view = document.createElement('div')
  view.className = 'mpc__view'

  const idle = document.createElement('div')
  idle.className = 'mpc__idle'
  idle.innerHTML = `<img src="/images/xp/icons/MPC.png" width="150" alt="" /><button type="button" class="mpc__open-btn xp-btn">Открыть файл...</button>`

  const stage = document.createElement('div')
  stage.className = 'mpc__stage mpc__stage--hidden'
  stage.innerHTML = `<img src="/images/xp/icons/MPC.png" class="mpc__logo" width="120" alt="" />`

  const audio = document.createElement('audio')
  audio.loop = true

  view.append(idle, stage, audio)

  const seek = document.createElement('input')
  seek.type = 'range'
  seek.className = 'mpc__seek'
  seek.min = '0'
  seek.max = '0'
  seek.value = '0'
  seek.disabled = true

  const volumeWrap = document.createElement('div')
  volumeWrap.className = 'mpc__volume'
  const volume = document.createElement('input')
  volume.type = 'range'
  volume.className = 'mpc__volume-slider'
  volume.min = '0'
  volume.max = '100'
  volume.value = '80'
  volumeWrap.append(volume)

  const toolbar = document.createElement('div')
  toolbar.className = 'mpc__toolbar'
  const transport = document.createElement('div')
  transport.className = 'mpc__transport'
  transport.innerHTML = `
    <button type="button" class="mpc__btn" data-act="play" title="Воспроизведение/пауза" disabled>▶</button>
    <button type="button" class="mpc__btn" data-act="stop" title="Стоп" disabled>■</button>
    <button type="button" class="mpc__btn" data-act="back15" title="−15 с" disabled>⏪</button>
    <button type="button" class="mpc__btn" data-act="back5" title="−5 с" disabled>◀</button>
    <button type="button" class="mpc__btn" data-act="fwd5" title="+5 с" disabled>▶</button>
    <button type="button" class="mpc__btn" data-act="fwd15" title="+15 с" disabled>⏩</button>
    <button type="button" class="mpc__btn mpc__btn--loop mpc__btn--active" data-act="loop" title="Повтор">↻</button>
  `
  toolbar.append(transport, volumeWrap)

  const status = document.createElement('div')
  status.className = 'mpc__status'
  status.innerHTML = `<span class="mpc__status-left">Закрыто</span><span class="mpc__status-right"></span>`

  const controls = document.createElement('div')
  controls.className = 'mpc__controls'
  controls.append(seek, toolbar, volumeWrap, status)

  root.append(view, controls)

  let loaded = false
  let seeking = false
  let loop = true

  const playBtn = transport.querySelector<HTMLButtonElement>('[data-act="play"]')!
  const loopBtn = transport.querySelector<HTMLButtonElement>('[data-act="loop"]')!
  const transportBtns = transport.querySelectorAll<HTMLButtonElement>('.mpc__btn:not([data-act="loop"])')
  const statusLeft = status.querySelector('.mpc__status-left')!
  const statusRight = status.querySelector('.mpc__status-right')!

  const setTransportEnabled = (on: boolean) => {
    transportBtns.forEach((btn) => { btn.disabled = !on })
    seek.disabled = !on
  }

  const setPlayingUi = (on: boolean) => {
    idle.classList.toggle('mpc__idle--hidden', on)
    stage.classList.toggle('mpc__stage--hidden', !on)
    setTransportEnabled(on)
  }

  const updatePlayBtn = () => {
    playBtn.textContent = audio.paused ? '▶' : '❚❚'
  }

  const updateStatus = () => {
    if (!loaded) {
      statusLeft.textContent = 'Закрыто'
      statusRight.textContent = ''
      return
    }
    statusLeft.textContent = audio.paused ? 'Пауза' : 'Воспроизведение'
    statusRight.textContent = `${formatTime(audio.currentTime)}/${formatTime(audio.duration || 0)}`
  }

  const loadMedia = (url: string, title: string) => {
    audio.src = url
    audio.load()
    loaded = true
    setPlayingUi(true)
    windowManager.setTitle(winId, title)
    void audio.play().catch(() => {})
    updatePlayBtn()
    updateStatus()
  }

  const stop = () => {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    loaded = false
    seek.value = '0'
    seek.max = '0'
    setPlayingUi(false)
    windowManager.setTitle(winId, 'Media Player Classic')
    playBtn.textContent = '▶'
    updateStatus()
  }

  audio.addEventListener('loadedmetadata', () => {
    seek.max = String(Math.floor(audio.duration) || 0)
    updateStatus()
  })

  audio.addEventListener('timeupdate', () => {
    if (!seeking) seek.value = String(Math.floor(audio.currentTime))
    updateStatus()
  })

  audio.addEventListener('play', () => { updatePlayBtn(); updateStatus() })
  audio.addEventListener('pause', () => { updatePlayBtn(); updateStatus() })
  audio.addEventListener('ended', updateStatus)

  seek.addEventListener('input', () => {
    seeking = true
    audio.currentTime = Number(seek.value)
    updateStatus()
  })
  seek.addEventListener('change', () => { seeking = false })

  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value) / 100
  })
  audio.volume = 0.8

  transport.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.mpc__btn')
    if (!btn || btn.disabled) return
    const act = btn.dataset.act
    if (act === 'play') {
      if (audio.paused) void audio.play()
      else audio.pause()
    } else if (act === 'stop') {
      stop()
    } else if (act === 'back5') {
      audio.currentTime = Math.max(0, audio.currentTime - 5)
    } else if (act === 'back15') {
      audio.currentTime = Math.max(0, audio.currentTime - 15)
    } else if (act === 'fwd5') {
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5)
    } else if (act === 'fwd15') {
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 15)
    } else if (act === 'loop') {
      loop = !loop
      audio.loop = loop
      loopBtn.classList.toggle('mpc__btn--active', loop)
    }
  })

  idle.querySelector('.mpc__open-btn')!.addEventListener('click', () => {
    openExplorer(PATH_MY_MUSIC)
  })

  const winId = windowManager.open({
    title: opts.title ?? 'Media Player Classic',
    icon: 'icon-mediaplayer',
    width: 700,
    height: 500,
    resizable: true,
    content: root,
    onClose: () => {
      audio.pause()
      audio.removeAttribute('src')
    },
  })

  if (opts.mediaUrl) loadMedia(opts.mediaUrl, opts.title ?? 'Media Player Classic')
}
