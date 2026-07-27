import type { FSNode } from './filesystem'

export interface RecycleItem {
  name: string
  originalPath: string
  node: FSNode
  deletedAt: number
}

const STORAGE_KEY = 'xp-recycle-bin-v1'
const SEED_KEY = 'xp-recycle-seeded-v1'
let items: RecycleItem[] = load()

function load(): RecycleItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as RecycleItem[]) : []
  } catch {
    return []
  }
}

function save(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function seedDefaultItem(): void {
  if (localStorage.getItem(SEED_KEY)) return
  if (items.length > 0) {
    localStorage.setItem(SEED_KEY, '1')
    return
  }
  items.push({
    name: 'draft_hook.ass',
    originalPath: 'C:\\Documents and Settings\\Пользователь\\Мои документы',
    node: {
      name: 'draft_hook.ass',
      type: 'file',
      icon: 'icon-file-text',
      size: '12 КБ',
      modified: '28.03.2005 18:04',
    },
    deletedAt: Date.now() - 86400000 * 3,
  })
  localStorage.setItem(SEED_KEY, '1')
  save()
}

seedDefaultItem()

export function addToRecycle(originalPath: string, node: FSNode): void {
  items.unshift({
    name: node.name,
    originalPath,
    node: structuredClone(node),
    deletedAt: Date.now(),
  })
  save()
}

export function getRecycleItems(): RecycleItem[] {
  return [...items]
}

export function isRecycleEmpty(): boolean {
  return items.length === 0
}

export function emptyRecycleBin(): void {
  items = []
  save()
}

export function restoreFromRecycle(index: number): RecycleItem | null {
  const item = items[index]
  if (!item) return null
  items.splice(index, 1)
  save()
  return item
}
