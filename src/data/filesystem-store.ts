import {
  FILE_SYSTEM,
  PATH_DESKTOP,
  SEP,
  joinPath,
  kindOf,
  resolve,
  type FSNode,
} from './filesystem'
import { formatDateTime } from '../utils/helpers'

export type SortKey = 'name' | 'size' | 'kind' | 'modified'

export function getParentNode(path: string): FSNode | null {
  const chain = resolve(path)
  return chain ? chain[chain.length - 1] : null
}

export function uniqueNameIn(parent: FSNode, base: string, ext = ''): string {
  const names = new Set((parent.children ?? []).map((child) => child.name.toLowerCase()))
  let candidate = base + ext
  if (!names.has(candidate.toLowerCase())) return candidate
  for (let i = 2; i < 100; i += 1) {
    candidate = `${base} (${i})${ext}`
    if (!names.has(candidate.toLowerCase())) return candidate
  }
  return `${base} (${Date.now()})${ext}`
}

export function addFolder(parentPath: string, baseName = 'Новая папка'): FSNode | null {
  const parent = getParentNode(parentPath)
  if (!parent) return null
  if (!parent.children) parent.children = []
  const name = uniqueNameIn(parent, baseName)
  const node: FSNode = {
    name,
    type: 'folder',
    icon: 'icon-folder',
    modified: formatDateTime(new Date()),
    children: [],
  }
  parent.children.push(node)
  return node
}

export function addTextFile(parentPath: string, baseName = 'Новый текстовый документ', ext = '.txt'): FSNode | null {
  const parent = getParentNode(parentPath)
  if (!parent) return null
  if (!parent.children) parent.children = []
  const name = uniqueNameIn(parent, baseName, ext)
  const node: FSNode = {
    name,
    type: 'file',
    icon: ext === '.doc' ? 'icon-file-doc' : ext === '.bmp' ? 'icon-file-jpg' : 'icon-file-text',
    size: '0 КБ',
    modified: formatDateTime(new Date()),
    content: '',
  }
  parent.children.push(node)
  return node
}

export function addShortcutFile(
  parentPath: string,
  label: string,
  target: string,
  targetIcon: string,
): FSNode | null {
  const parent = getParentNode(parentPath)
  if (!parent) return null
  if (!parent.children) parent.children = []
  const name = uniqueNameIn(parent, label.replace(/\.lnk$/i, ''), '.lnk')
  const node: FSNode = {
    name,
    type: 'file',
    icon: targetIcon,
    kind: 'Ярлык',
    modified: formatDateTime(new Date()),
    shortcutTarget: target,
  }
  parent.children.push(node)
  return node
}

export function removeChild(parentPath: string, name: string): FSNode | null {
  const parent = getParentNode(parentPath)
  if (!parent?.children) return null
  const index = parent.children.findIndex((child) => child.name === name)
  if (index < 0) return null
  const [removed] = parent.children.splice(index, 1)
  return removed ?? null
}

export function renameChild(parentPath: string, oldName: string, newName: string): boolean {
  const parent = getParentNode(parentPath)
  const item = parent?.children?.find((child) => child.name === oldName)
  if (!item || !parent?.children) return false
  if (parent.children.some((child) => child.name !== oldName && child.name.toLowerCase() === newName.toLowerCase())) {
    return false
  }
  item.name = newName
  item.modified = formatDateTime(new Date())
  return true
}

export function copyChildren(fromPath: string, names: string[], toPath: string, cut = false): boolean {
  const from = getParentNode(fromPath)
  const to = getParentNode(toPath)
  if (!from?.children || !to) return false
  if (!to.children) to.children = []
  for (const name of names) {
    const source = from.children.find((child) => child.name === name)
    if (!source) continue
    const clone = structuredClone(source)
    clone.name = uniqueNameIn(to, source.name.replace(/\.lnk$/i, ''), source.name.endsWith('.lnk') ? '.lnk' : '')
    clone.modified = formatDateTime(new Date())
    to.children.push(clone)
    if (cut) removeChild(fromPath, name)
  }
  return true
}

export function sortNodes(items: FSNode[], key: SortKey): FSNode[] {
  const folders = items.filter((item) => item.type === 'folder')
  const files = items.filter((item) => item.type !== 'folder')
  const sortFn = (a: FSNode, b: FSNode) => {
    switch (key) {
      case 'size':
        return parseSize(a.size).localeCompare(parseSize(b.size), 'ru', { numeric: true })
      case 'kind':
        return kindOf(a).localeCompare(kindOf(b), 'ru')
      case 'modified':
        return (a.modified ?? '').localeCompare(b.modified ?? '', 'ru')
      default:
        return a.name.localeCompare(b.name, 'ru')
    }
  }
  return [...folders.sort(sortFn), ...files.sort(sortFn)]
}

function parseSize(size?: string): string {
  if (!size) return '0'
  return size.replace(/\s/g, '')
}

export function searchFilesystem(query: string): Array<{ path: string; node: FSNode }> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const results: Array<{ path: string; node: FSNode }> = []
  walk(FILE_SYSTEM, [FILE_SYSTEM.name], results, q)
  return results
}

function walk(node: FSNode, parts: string[], results: Array<{ path: string; node: FSNode }>, q: string): void {
  const nodePath = joinPath(parts)
  if (node !== FILE_SYSTEM && node.name.toLowerCase().includes(q)) {
    results.push({ path: nodePath, node })
  }
  for (const child of node.children ?? []) {
    walk(child, [...parts, child.name], results, q)
  }
}

export function itemFullPath(parentPath: string, name: string): string {
  return parentPath + SEP + name
}

export function isDesktopPath(path: string): boolean {
  return path === PATH_DESKTOP
}

export function isSystemDesktopChild(name: string): boolean {
  return ['Мои документы', 'Мой компьютер', 'Сетевое окружение', 'Корзина'].includes(name)
}
