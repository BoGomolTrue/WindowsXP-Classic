import JSZip from 'jszip'
import { findNode, type FSNode } from './filesystem'
import { itemFullPath, addFolder, getParentNode, uniqueNameIn } from './filesystem-store'
import { archiveBaseName, formatByteSize, isArchiveFile } from './archive'
import { extensionOf, isImageFile, isAudioFile } from './media'
import { formatDateTime } from '../utils/helpers'
import { Archive } from '../vendor/libarchive/libarchive.js'
import { emitFsChange } from './fs-events'

let libarchiveReady = false

function ensureLibarchive(): void {
  if (libarchiveReady) return
  Archive.init({ workerUrl: '/js/libarchive.js/dist/worker-bundle.js' })
  libarchiveReady = true
}

function iconForFile(name: string): string {
  if (isArchiveFile(name)) {
    return extensionOf(name) === 'zip' ? 'Zipfolder.png' : 'RAR.png'
  }
  if (isImageFile(name)) return 'icon-file-jpg'
  if (isAudioFile(name)) return 'icon-mediaplayer'
  const ext = extensionOf(name)
  if (ext === 'doc') return 'icon-file-doc'
  if (ext === 'xls') return 'icon-file-xls'
  if (ext === 'txt' || ext === 'ini' || ext === 'bat' || ext === 'log') return 'icon-file-text'
  if (ext === 'exe') return 'icon-file-exe'
  return 'icon-file'
}

export function addBlobFile(parentPath: string, fileName: string, blob: Blob): FSNode | null {
  const parent = getParentNode(parentPath)
  if (!parent) return null
  if (!parent.children) parent.children = []
  const dot = fileName.lastIndexOf('.')
  const base = dot >= 0 ? fileName.slice(0, dot) : fileName
  const ext = dot >= 0 ? fileName.slice(dot) : ''
  const name = uniqueNameIn(parent, base, ext)
  const node: FSNode = {
    name,
    type: 'file',
    icon: iconForFile(name),
    size: formatByteSize(blob.size),
    modified: formatDateTime(new Date()),
    mediaUrl: URL.createObjectURL(blob),
  }
  parent.children.push(node)
  return node
}

async function blobForNode(node: FSNode): Promise<Blob | string> {
  if (node.mediaUrl) {
    const res = await fetch(node.mediaUrl)
    return res.blob()
  }
  if (node.content !== undefined) return node.content
  return ''
}

async function addNodeToZip(zip: JSZip, node: FSNode, pathPrefix: string): Promise<void> {
  const entryPath = pathPrefix ? `${pathPrefix}/${node.name}` : node.name
  if (node.type === 'folder') {
    for (const child of node.children ?? []) {
      await addNodeToZip(zip, child, entryPath)
    }
    return
  }
  if (node.shortcutTarget) return
  const data = await blobForNode(node)
  zip.file(entryPath, data)
}

export async function compressItem(parentPath: string, name: string): Promise<FSNode | null> {
  const parent = getParentNode(parentPath)
  const item = parent?.children?.find((child) => child.name === name)
  if (!item) return null

  const zip = new JSZip()
  if (item.type === 'folder') {
    for (const child of item.children ?? []) {
      await addNodeToZip(zip, child, item.name)
    }
  } else {
    await addNodeToZip(zip, item, '')
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const zipName = `${archiveBaseName(item.name)}.zip`
  const created = addBlobFile(parentPath, zipName, blob)
  emitFsChange()
  return created
}

async function fetchArchiveBlob(node: FSNode): Promise<Blob> {
  if (!node.mediaUrl) throw new Error('Архив недоступен')
  const res = await fetch(node.mediaUrl)
  if (!res.ok) throw new Error('Не удалось прочитать архив')
  return res.blob()
}

async function saveExtractedEntry(obj: unknown, parentPath: string, key: string): Promise<void> {
  if (obj instanceof File) {
    addBlobFile(parentPath, obj.name, obj)
    return
  }
  if (!obj || typeof obj !== 'object') return
  const record = obj as Record<string, unknown>
  const folder = addFolder(parentPath, key)
  if (!folder) return
  const folderPath = itemFullPath(parentPath, folder.name)
  for (const childKey of Object.keys(record)) {
    await saveExtractedEntry(record[childKey], folderPath, childKey)
  }
}

export async function extractArchive(parentPath: string, name: string, password?: string): Promise<void> {
  const parent = getParentNode(parentPath)
  const item = parent?.children?.find((child) => child.name === name)
  if (!item?.mediaUrl) throw new Error('Архив недоступен')

  const blob = await fetchArchiveBlob(item)
  const file = new File([blob], item.name, { type: 'application/octet-stream' })
  const ext = extensionOf(item.name)

  if (ext === 'zip') {
    const zip = await JSZip.loadAsync(blob)
    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue
      const parts = path.split('/').filter(Boolean)
      const fileName = parts.pop()!
      let currentPath = parentPath
      for (const part of parts) {
        const full = itemFullPath(currentPath, part)
        const existing = findNode(full)
        if (existing?.type === 'folder') {
          currentPath = full
        } else {
          const created = addFolder(currentPath, part)
          if (!created) throw new Error('Не удалось создать папку')
          currentPath = itemFullPath(currentPath, created.name)
        }
      }
      const content = await entry.async('blob')
      addBlobFile(currentPath, fileName, content)
    }
    emitFsChange()
    return
  }

  ensureLibarchive()
  const archive = await Archive.open(file)
  const encrypted = await archive.hasEncryptedData()
  if (encrypted) {
    if (!password) throw new Error('ENCRYPTED')
    await archive.usePassword(password)
  }
  const extracted = await archive.extractFiles(() => {})
  for (const key of Object.keys(extracted)) {
    await saveExtractedEntry(extracted[key], parentPath, key)
  }
  emitFsChange()
}
