const STORAGE_KEY = 'xp-wallpaper'

export type WallpaperId =
  | 'bliss'
  | 'ascent'
  | 'autumn'
  | 'azul'
  | 'follow'
  | 'friend'
  | 'moonflower'
  | 'radiance'
  | 'redmoondesert'
  | 'tulips'
  | 'wind'

export interface Wallpaper {
  id: WallpaperId
  label: string
  file: string
}

export const WALLPAPERS: Wallpaper[] = [
  { id: 'bliss', label: 'Bliss', file: 'Bliss.jpg' },
  { id: 'ascent', label: 'Ascent', file: 'Ascent.jpg' },
  { id: 'autumn', label: 'Autumn', file: 'Autumn.jpg' },
  { id: 'azul', label: 'Azul', file: 'Azul.jpg' },
  { id: 'follow', label: 'Follow', file: 'Follow.jpg' },
  { id: 'friend', label: 'Friend', file: 'Friend.jpg' },
  { id: 'moonflower', label: 'Moon flower', file: 'Moonflower.jpg' },
  { id: 'radiance', label: 'Radiance', file: 'Radiance.jpg' },
  { id: 'redmoondesert', label: 'Red moon desert', file: 'Redmoondesert.jpg' },
  { id: 'tulips', label: 'Tulips', file: 'Tulips.jpg' },
  { id: 'wind', label: 'Wind', file: 'Wind.jpg' },
]

const LEGACY_MAP: Record<string, WallpaperId> = {
  moon: 'moonflower',
  'solid-blue': 'azul',
  'solid-green': 'bliss',
  'solid-silver': 'wind',
  none: 'bliss',
}

let currentWallpaper = loadWallpaper()

function isWallpaperId(value: string): value is WallpaperId {
  return WALLPAPERS.some((w) => w.id === value)
}

function loadWallpaper(): WallpaperId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return 'bliss'
    if (isWallpaperId(stored)) return stored
    return LEGACY_MAP[stored] ?? 'bliss'
  } catch {
    return 'bliss'
  }
}

export function getWallpaperId(): WallpaperId {
  return currentWallpaper
}

export function getWallpaperUrl(id: WallpaperId = currentWallpaper): string {
  const wp = WALLPAPERS.find((w) => w.id === id)
  return `/files/wallpapers/${wp?.file ?? 'Bliss.jpg'}`
}

export function setWallpaper(id: WallpaperId): void {
  if (!isWallpaperId(id)) return
  currentWallpaper = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch { /* ignore */ }
  applyWallpaper()
}

export function applyWallpaper(): void {
  const desktop = document.querySelector('.desktop') as HTMLElement | null
  if (!desktop) return
  desktop.style.backgroundColor = '#3a6ea5'
  desktop.style.backgroundImage = `url("${getWallpaperUrl()}")`
  desktop.style.backgroundSize = 'cover'
  desktop.style.backgroundPosition = 'center'
  desktop.style.backgroundRepeat = 'no-repeat'
}
