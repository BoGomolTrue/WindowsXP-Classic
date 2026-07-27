import type { FSNode } from '../data/filesystem'
import { PATH_CONTROL_PANEL, PATH_DESKTOP, findNode, parentPath } from '../data/filesystem'
import { openExplorer } from '../windows/Explorer'
import { showProperties } from '../dialogs/PropertiesDialog'
import { showMessage } from '../dialogs/MessageBox'
import { openAppShell, openNotepad, openPaint, openWordPad } from './builtin'
import { runProgram } from './run'
import { openMediaPlayer } from '../windows/MediaPlayer'
import { openImageViewer } from '../windows/ImageViewer'
import { isAudioFile, isImageFile } from '../data/media'
import { isArchiveFile } from '../data/archive'
import { extractArchiveItem } from '../windows/WinRarDialog'

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
}

function fileContent(item: FSNode, fallback: string): string {
  return item.content ?? fallback
}

export function openFsPath(fsPath: string): boolean {
  const node = findNode(fsPath)
  if (!node) return false
  const parent = parentPath(fsPath) ?? PATH_DESKTOP
  if (node.type === 'folder') {
    openExplorer(fsPath)
    return true
  }
  openFileByNode(node, parent)
  return true
}

export function openFileByNode(item: FSNode, parentPath: string): void {
  if (item.shortcutTarget) {
    if (item.shortcutTarget.startsWith('app:')) {
      runProgram(item.shortcutTarget.slice(4))
      return
    }
    if (item.shortcutTarget.startsWith('path:')) {
      openExplorer(item.shortcutTarget.slice(5))
      return
    }
  }

  if (item.kind === 'Элемент панели управления') {
    if (item.name === 'Экран') showProperties({ name: 'Экран', type: 'display' })
    else showProperties({ name: item.name, type: 'folder' })
    return
  }
  if (parentPath.includes(PATH_CONTROL_PANEL)) {
    showProperties({ name: item.name, type: 'folder' })
    return
  }

  const lower = item.name.toLowerCase()
  const ext = extensionOf(item.name)

  if (ext === 'exe' || lower.endsWith('.exe')) {
    runProgram(item.name)
    return
  }
  if (ext === 'lnk') {
    void showMessage('Ярлык повреждён или указывает на удалённый объект.', item.name, 'error')
    return
  }
  if (ext === 'txt' || ext === 'log') {
    openNotepad(fileContent(item, ''), `${item.name} - Блокнот`, parentPath + '\\' + item.name)
    return
  }
  if (ext === 'ini' || ext === 'bat') {
    openNotepad(fileContent(item, `@echo off\n`), `${item.name} - Блокнот`, parentPath + '\\' + item.name)
    return
  }
  if (ext === 'doc') {
    openWordPad(fileContent(item, ''), `${item.name} - WordPad`)
    return
  }
  if (ext === 'xls') {
    openWordPad(fileContent(item, `${item.name}\n\n`), `${item.name} - Microsoft Excel`)
    return
  }
  if (isImageFile(item.name)) {
    if (item.mediaUrl) {
      openImageViewer({ title: item.name, mediaUrl: item.mediaUrl, parentPath, fileName: item.name })
      return
    }
    openPaint(`${item.name} - Paint`, item.mediaUrl)
    return
  }
  if (isAudioFile(item.name)) {
    if (item.mediaUrl) {
      openMediaPlayer({ title: item.name, mediaUrl: item.mediaUrl })
      return
    }
    openAppShell('Windows Media Player', 'icon-mediaplayer', `Воспроизведение: ${item.name}`)
    return
  }
  if (isArchiveFile(item.name)) {
    extractArchiveItem(parentPath, item.name)
    return
  }

  void showMessage(
    `Windows не может открыть этот файл.\n\nЧтобы открыть этот файл, Windows необходимо знать, какая программа его создала.`,
    item.name,
    'error',
  )
}
