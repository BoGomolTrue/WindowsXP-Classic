import { BOOT_INI_EGG, NOTES_EGG } from './easter-eggs'

export interface FSNode {
  name: string
  type: 'folder' | 'file'
  icon?: string
  children?: FSNode[]
  size?: string
  modified?: string
  /** Тип, показываемый в столбце «Тип»; иначе выводится по расширению. */
  kind?: string
  /** Путь в адресной строке для этого узла и его потомков, напр. «C:\». */
  addr?: string
  /** Особый набор столбцов (как у «Моего компьютера»). */
  view?: 'drives'
  total?: string
  free?: string
  shortcutTarget?: string
  content?: string
  mediaUrl?: string
}

export const SEP = '\\'
export const PATH_DESKTOP = 'Рабочий стол'
export const PATH_MY_COMPUTER = 'Рабочий стол\\Мой компьютер'
export const PATH_MY_DOCUMENTS = 'Рабочий стол\\Мои документы'
export const PATH_MY_PICTURES = 'Рабочий стол\\Мои документы\\Мои рисунки'
export const PATH_MY_MUSIC = 'Рабочий стол\\Мои документы\\Моя музыка'
export const PATH_CONTROL_PANEL = 'Рабочий стол\\Мой компьютер\\Панель управления'
export const PATH_NETWORK = 'Рабочий стол\\Сетевое окружение'

const D = '08.08.2004 14:00'

export const FILE_SYSTEM: FSNode = {
  name: PATH_DESKTOP,
  type: 'folder',
  icon: 'icon-showdesktop',
  children: [
    {
      name: 'Мои документы',
      type: 'folder',
      icon: 'icon-documents',
      addr: 'C:\\Documents and Settings\\Пользователь\\Мои документы',
      children: [
        {
          name: 'Мои рисунки', type: 'folder', icon: 'icon-pictures', children: [
            { name: 'Blue Hill.jpg', type: 'file', icon: 'icon-file-jpg', size: '22 КБ', modified: '10.02.2005 18:22', mediaUrl: '/files/blue_hill.jpg' },
            { name: 'Sunset.jpg', type: 'file', icon: 'icon-file-jpg', size: '45 КБ', modified: '04.11.2004 09:15', mediaUrl: '/files/sunset.jpg' },
            { name: 'Water Lily.jpg', type: 'file', icon: 'icon-file-jpg', size: '72 КБ', modified: '17.07.2005 19:55', mediaUrl: '/files/water_lily.jpg' },
            { name: 'Winter.jpg', type: 'file', icon: 'icon-file-jpg', size: '95 КБ', modified: '22.01.2005 16:03', mediaUrl: '/files/winter.jpg' },
          ],
        },
        {
          name: 'Моя музыка', type: 'folder', icon: 'icon-music', children: [
            { name: "Beethoven's Symphony No. 9 (Scherzo).mp3", type: 'file', icon: 'icon-mediaplayer', size: '1 287 КБ', modified: '08.08.2004 14:00', mediaUrl: '/files/symphony_9.mp3' },
            { name: 'New Stories (Highway Blues).mp3', type: 'file', icon: 'icon-mediaplayer', size: '1 741 КБ', modified: '12.09.2005 20:41', mediaUrl: '/files/new_stories.mp3' },
          ],
        },
        { name: 'report.doc', type: 'file', icon: 'icon-file-doc', size: '24 КБ', modified: '15.03.2005 11:47', content: 'Отчёт\n' },
        { name: 'budget.xls', type: 'file', icon: 'icon-file-xls', size: '58 КБ', modified: '22.01.2005 16:03' },
        { name: 'notes.txt', type: 'file', icon: 'icon-file-text', size: '2 КБ', modified: '28.03.2005 08:12', content: NOTES_EGG },
      ],
    },
    {
      name: 'Мой компьютер',
      type: 'folder',
      icon: 'icon-computer',
      addr: 'Мой компьютер',
      view: 'drives',
      children: [
        {
          name: 'Локальный диск (C:)',
          type: 'folder',
          icon: 'icon-drive',
          addr: 'C:\\',
          kind: 'Локальный диск',
          total: '19,5 ГБ',
          free: '12,1 ГБ',
          children: [
            {
              name: 'Documents and Settings', type: 'folder', modified: D, children: [
                {
                  name: 'Пользователь', type: 'folder', modified: D, children: [
                    { name: 'Мои документы', type: 'folder', icon: 'icon-documents', modified: D, children: [] },
                    { name: 'Рабочий стол', type: 'folder', modified: D, children: [] },
                    { name: 'Главное меню', type: 'folder', modified: D, children: [] },
                  ],
                },
                { name: 'All Users', type: 'folder', modified: D, children: [] },
              ],
            },
            {
              name: 'Program Files', type: 'folder', modified: D, children: [
                {
                  name: 'Internet Explorer', type: 'folder', modified: D, children: [
                    { name: 'iexplore.exe', type: 'file', icon: 'icon-ie', size: '93 КБ', modified: D },
                  ],
                },
                {
                  name: 'Outlook Express', type: 'folder', modified: D, children: [
                    { name: 'msimn.exe', type: 'file', icon: 'icon-outlook', size: '69 КБ', modified: D },
                  ],
                },
                {
                  name: 'Windows Media Player', type: 'folder', modified: D, children: [
                    { name: 'wmplayer.exe', type: 'file', icon: 'icon-mediaplayer', size: '124 КБ', modified: D },
                  ],
                },
                { name: 'Windows NT', type: 'folder', modified: D, children: [] },
              ],
            },
            {
              name: 'WINDOWS', type: 'folder', modified: D, children: [
                { name: 'system32', type: 'folder', modified: D, children: [] },
                { name: 'Fonts', type: 'folder', modified: D, children: [] },
                { name: 'Help', type: 'folder', modified: D, children: [] },
                { name: 'Web', type: 'folder', modified: D, children: [] },
                { name: 'explorer.exe', type: 'file', icon: 'icon-folder-open', size: '1 010 КБ', modified: D },
                { name: 'notepad.exe', type: 'file', icon: 'icon-notepad', size: '66 КБ', modified: D },
                { name: 'win.ini', type: 'file', icon: 'icon-file-text', size: '1 КБ', modified: D },
              ],
            },
            { name: 'AUTOEXEC.BAT', type: 'file', icon: 'icon-file-text', size: '0 КБ', modified: D },
            { name: 'boot.ini', type: 'file', icon: 'icon-file-text', size: '1 КБ', modified: D, content: BOOT_INI_EGG },
          ],
        },
        {
          name: 'Локальный диск (D:)',
          type: 'folder',
          icon: 'icon-drive',
          addr: 'D:\\',
          kind: 'Локальный диск',
          total: '38,2 ГБ',
          free: '30,7 ГБ',
          children: [
            { name: 'Архив', type: 'folder', modified: '12.09.2005 20:41', children: [
              { name: 'podcast_raw.avi', type: 'file', icon: 'icon-mediaplayer', size: '4,2 ГБ', modified: '12.09.2005 20:41' },
            ] },
            { name: 'Музыка', type: 'folder', icon: 'icon-music', modified: '02.06.2005 12:10', children: [] },
            { name: 'Фото', type: 'folder', icon: 'icon-pictures', modified: '17.07.2005 19:55', children: [] },
          ],
        },
        {
          name: 'Дисковод (E:)',
          type: 'folder',
          icon: 'icon-cdrom',
          addr: 'E:\\',
          kind: 'Компакт-диск',
          children: [],
        },
      ],
    },
    {
      name: 'Сетевое окружение',
      type: 'folder',
      icon: 'icon-network',
      addr: 'Сетевое окружение',
      children: [
        { name: 'Вся сеть', type: 'folder', icon: 'icon-network', kind: 'Системная папка', children: [] },
      ],
    },
    { name: 'Корзина', type: 'folder', icon: 'icon-recycle', addr: 'Корзина', children: [] },
  ],
}

export function splitPath(path: string): string[] {
  return path.split(SEP).filter(Boolean)
}

export function joinPath(parts: string[]): string {
  return parts.join(SEP)
}

/** Возвращает цепочку узлов от корня до указанного пути. */
export function resolve(path: string): FSNode[] | null {
  const parts = splitPath(path)
  if (!parts.length || parts[0] !== FILE_SYSTEM.name) return null
  const chain: FSNode[] = [FILE_SYSTEM]
  for (let i = 1; i < parts.length; i++) {
    const parent = chain[chain.length - 1]
    const child = parent.children?.find((c) => c.name === parts[i])
    if (!child) return null
    chain.push(child)
  }
  return chain
}

export function findNode(path: string): FSNode | null {
  const chain = resolve(path)
  return chain ? chain[chain.length - 1] : null
}

export function parentPath(path: string): string | null {
  const parts = splitPath(path)
  if (parts.length <= 1) return null
  parts.pop()
  return joinPath(parts)
}

/** Текст адресной строки: «C:\Program Files», «Мой компьютер» и т. п. */
export function addressOf(path: string): string {
  const chain = resolve(path)
  if (!chain) return path
  let baseIndex = -1
  for (let i = chain.length - 1; i >= 0; i--) {
    if (chain[i].addr) { baseIndex = i; break }
  }
  if (baseIndex < 0) return chain[chain.length - 1].name

  const base = chain[baseIndex].addr!
  const rest = chain.slice(baseIndex + 1).map((n) => n.name)
  if (!rest.length) return base
  return base.endsWith(SEP) ? base + rest.join(SEP) : base + SEP + rest.join(SEP)
}

const EXT_KINDS: Record<string, string> = {
  txt: 'Текстовый документ',
  ini: 'Параметры конфигурации',
  bat: 'Пакетный файл MS-DOS',
  doc: 'Документ Microsoft Word',
  xls: 'Лист Microsoft Excel',
  jpg: 'Рисунок JPEG',
  bmp: 'Точечный рисунок',
  png: 'Рисунок PNG',
  gif: 'Рисунок GIF',
  mp3: 'Аудиофайл MP3',
  wav: 'Аудиофайл WAV',
  wma: 'Аудиофайл Windows Media',
  exe: 'Приложение',
  dll: 'Компонент приложения',
  zip: 'Архив ZIP',
  rar: 'Архив WinRAR',
  '7z': 'Архив 7-Zip',
  tar: 'Архив TAR',
}

export function kindOf(node: FSNode): string {
  if (node.kind) return node.kind
  if (node.type === 'folder') return 'Папка с файлами'
  const dot = node.name.lastIndexOf('.')
  if (dot < 0) return 'Файл'
  const ext = node.name.slice(dot + 1).toLowerCase()
  return EXT_KINDS[ext] ?? `Файл «${ext.toUpperCase()}»`
}
