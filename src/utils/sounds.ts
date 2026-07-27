let audioCtx: AudioContext | null = null
const audioCache = new Map<string, HTMLAudioElement>()

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.15, delay = 0): void {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    const t = ctx.currentTime + delay
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(vol, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + duration + 0.05)
  } catch { /* audio not available */ }
}

async function playFile(path: string, volume = 0.85): Promise<boolean> {
  try {
    let audio = audioCache.get(path)
    if (!audio) {
      audio = new Audio(path)
      audio.preload = 'auto'
      audioCache.set(path, audio)
      await new Promise<void>((resolve, reject) => {
        audio!.addEventListener('canplaythrough', () => resolve(), { once: true })
        audio!.addEventListener('error', () => reject(), { once: true })
        audio!.load()
      })
    }
    audio.currentTime = 0
    audio.volume = volume
    await audio.play()
    return true
  } catch {
    return false
  }
}

export function preloadSounds(): void {
  for (const path of ['/audio/xp_startup.mp3']) {
    if (audioCache.has(path)) continue
    const audio = new Audio(path)
    audio.preload = 'auto'
    audioCache.set(path, audio)
    audio.load()
  }
}

export function playClick(): void {
  playTone(1200, 0.04, 'square', 0.04)
}

export function playBiosBeep(): void {
  playTone(880, 0.08, 'square', 0.06)
}

export function playLogon(): void {
  void playFile('/audio/logon.mp3').then((ok) => {
    if (!ok) {
      playTone(784, 0.12, 'triangle', 0.1)
      playTone(988, 0.18, 'triangle', 0.08, 0.08)
    }
  })
}

export async function playStartup(): Promise<void> {
  await playFile('/audio/xp_startup.mp3')
}

export function playError(): void {
  playTone(180, 0.2, 'square', 0.09)
  playTone(140, 0.25, 'square', 0.08, 0.12)
}

export function playNavigate(): void {
  playTone(900, 0.025, 'sine', 0.035)
}

export function playMinimize(): void {
  playTone(520, 0.07, 'sine', 0.045)
  setTimeout(() => playTone(380, 0.08, 'sine', 0.04), 35)
}

export function playRestore(): void {
  playTone(380, 0.07, 'sine', 0.045)
  setTimeout(() => playTone(520, 0.08, 'sine', 0.04), 35)
}

export function playClose(): void {
  playTone(440, 0.06, 'sine', 0.04)
}
