import { PATH_MY_DOCUMENTS } from './filesystem'

const STORAGE_KEY = 'xp-favorites-v1'
const EXPLORER_KEY = 'xp-explorer-favorites-v1'

export interface FavoriteItem {
  title: string
  url: string
}

export function loadFavorites(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as FavoriteItem[]
  } catch {
    return defaultFavorites()
  }
  return defaultFavorites()
}

function defaultFavorites(): FavoriteItem[] {
  return [
    { title: 'Windows Catalog', url: 'https://vertix-bot.ru' },
    { title: 'Windows Update', url: 'https://vertix-bot.ru' },
  ]
}

export function saveFavorites(items: FavoriteItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function addFavorite(title: string, url: string): void {
  const items = loadFavorites()
  if (items.some((item) => item.url === url)) return
  items.push({ title, url })
  saveFavorites(items)
}

export function addExplorerFavorite(path: string): void {
  const items = loadExplorerFavorites()
  if (items.includes(path)) return
  items.push(path)
  saveExplorerFavorites(items)
}

export function loadExplorerFavorites(): string[] {
  try {
    const raw = localStorage.getItem(EXPLORER_KEY)
    return raw ? (JSON.parse(raw) as string[]) : [PATH_MY_DOCUMENTS]
  } catch {
    return [PATH_MY_DOCUMENTS]
  }
}

export function saveExplorerFavorites(items: string[]): void {
  localStorage.setItem(EXPLORER_KEY, JSON.stringify(items))
}
