import {
  PATH_CONTROL_PANEL,
  PATH_MY_COMPUTER,
  PATH_MY_DOCUMENTS,
  PATH_MY_MUSIC,
  PATH_MY_PICTURES,
  PATH_NETWORK,
} from '../data/filesystem'
import { openExplorer } from '../windows/Explorer'
import { openInternetExplorer } from '../windows/InternetExplorer'
import { showMessage } from '../dialogs/MessageBox'
import { showPrompt } from '../dialogs/PromptDialog'
import { showProperties } from '../dialogs/PropertiesDialog'
import { showAbout } from '../dialogs/AboutDialog'
import { openTaskManager } from './TaskManager'
import { openSearchDialog } from './SearchDialog'
import { showProgressDialog } from './ProgressDialog'
import {
  openAppShell,
  openOutlookExpress,
  openCalculator,
  openCommandPrompt,
  openMinesweeper,
  openNotepad,
  openPaint,
  openWordPad,
} from './builtin'
import { isAspectRatioRun, NOTES_EGG, RUN_916_HINT } from '../data/easter-eggs'
import { openFileByNode } from './openFile'
import { openMediaPlayer } from '../windows/MediaPlayer'

const RUN_MAP: Record<string, () => void> = {
  notepad: () => openNotepad(),
  'notepad.exe': () => openNotepad(),
  calc: () => openCalculator(),
  calculator: () => openCalculator(),
  'calc.exe': () => openCalculator(),
  cmd: () => openCommandPrompt(),
  'cmd.exe': () => openCommandPrompt(),
  mspaint: () => openPaint(),
  'mspaint.exe': () => openPaint(),
  paint: () => openPaint(),
  wordpad: () => openWordPad(),
  'wordpad.exe': () => openWordPad(),
  iexplore: () => openInternetExplorer(),
  'iexplore.exe': () => openInternetExplorer(),
  explorer: () => openExplorer(),
  'explorer.exe': () => openExplorer(),
  taskmgr: () => openTaskManager(),
  'taskmgr.exe': () => openTaskManager(),
  winmine: () => openMinesweeper(),
  'winmine.exe': () => openMinesweeper(),
  msimn: () => openOutlookExpress(),
  'msimn.exe': () => openOutlookExpress(),
  wmplayer: () => openMediaPlayer(),
  'wmplayer.exe': () => openMediaPlayer(),
  mpc: () => openMediaPlayer(),
  msmsgs: () => openAppShell('Windows Messenger', 'icon-messenger', 'Windows Messenger — войдите в .NET Passport.'),
  sol: () => openAppShell('Косынка', 'icon-file-exe', 'Раздайте колоду и начните игру.'),
  'sol.exe': () => openAppShell('Косынка', 'icon-file-exe', 'Раздайте колоду и начните игру.'),
  pinball: () => openAppShell('Пинбол', 'icon-file-exe', 'Pinball Space Cadet — нажмите F2 для новой игры.'),
  spider: () => openAppShell('Паук', 'icon-file-exe', 'Паук — выберите расклад из одной, двух или четырёх мастей.'),
}

export function runProgram(input: string): boolean {
  const raw = input.trim()
  if (!raw) return false
  const lower = raw.toLowerCase()
  const base = lower.split(/[\\/]/).pop() ?? lower

  if (RUN_MAP[base]) {
    RUN_MAP[base]()
    return true
  }
  if (lower.startsWith('http://') || lower.startsWith('https://') || /^[\w.-]+\.[a-z]{2,}/i.test(raw)) {
    openInternetExplorer(raw.startsWith('http') ? raw : `https://${raw}`)
    return true
  }
  if (lower === 'about:easter') {
    openInternetExplorer('about:easter')
    return true
  }
  if (lower.includes('мои документы')) { openExplorer(PATH_MY_DOCUMENTS); return true }
  if (lower.includes('мой компьютер')) { openExplorer(PATH_MY_COMPUTER); return true }
  if (lower.includes('control panel') || lower.includes('панель управления')) {
    openExplorer(PATH_CONTROL_PANEL)
    return true
  }
  return false
}

export async function showRunDialog(): Promise<void> {
  const input = await showPrompt(
    'Введите имя программы, папки или документа, который Windows должен открыть.',
    'Запуск программы',
    '',
    'icon-run',
  )
  if (!input) return
  if (isAspectRatioRun(input)) {
    void showMessage(
      `Windows не может найти файл «${input}».\n\nПроверьте правильность имени и повторите попытку.\n\n${RUN_916_HINT}`,
      'Запуск программы',
      'error',
    )
    return
  }
  if (!runProgram(input)) {
    void showMessage(`Windows не может найти файл «${input}».\n\nПроверьте правильность имени и повторите попытку.`, 'Запуск программы', 'error')
  }
}

export function launchByName(name: string): void {
  const lower = name.toLowerCase()
  if (lower.includes('internet explorer') || lower === 'ie') { openInternetExplorer(); return }
  if (lower.includes('outlook')) { openOutlookExpress(); return }
  if (lower.includes('media player') || lower === 'wmp' || lower.includes('player classic') || lower === 'mpc') {
    openMediaPlayer()
    return
  }
  if (lower.includes('messenger')) { openAppShell('Windows Messenger', 'icon-messenger', 'Windows Messenger — войдите в .NET Passport.'); return }
  if (lower.includes('блокнот') || lower === 'notepad') { openNotepad(); return }
  if (lower.includes('калькулятор') || lower === 'calc') { openCalculator(); return }
  if (lower.includes('командная строка') || lower === 'cmd') { openCommandPrompt(); return }
  if (lower.includes('paint')) { openPaint(); return }
  if (lower.includes('wordpad')) { openWordPad(); return }
  if (lower.includes('дефрагментация')) { showProgressDialog('Дефрагментация диска', 'Анализ диска C:...'); return }
  if (lower.includes('очистка диска')) { showProgressDialog('Очистка диска', 'Вычисление места, которое можно освободить...'); return }
  if (lower.includes('сетев') || lower.includes('подключ')) {
    openAppShell('Сетевые подключения', 'icon-network', 'Подключено: локальная сеть. IP-адрес назначается автоматически.')
    return
  }
  if (lower.includes('принтер')) {
    openAppShell('Принтеры и факсы', 'icon-printer', 'Принтеров не установлено.')
    return
  }
  if (lower.includes('поиск') || lower.includes('найти')) { openSearchDialog(); return }
  if (lower.includes('диспетчер задач')) { openTaskManager(); return
  }
  if (lower.includes('мастер новых')) {
    openAppShell('Мастер новых подключений', 'icon-network', 'Мастер поможет настроить подключение к Интернету.')
    return
  }
  if (lower.includes('помощник по поиску')) { openSearchDialog(); return }
  if (lower.includes('центр справки')) { openInternetExplorer('https://vertix-bot.ru'); return }
  if (lower.includes('справк') || lower.includes('help')) { openInternetExplorer('https://vertix-bot.ru'); return }
  if (lower.includes('сведения о системе')) { showAbout(); return }
  if (lower.includes('свойства панели')) {
    showProperties({ name: 'Панель задач', type: 'display' })
    return
  }
  if (lower.includes('адресная книга') || lower.includes('людей')) {
    openAppShell('Адресная книга', 'icon-catalog', 'Список контактов пуст.')
    return
  }
  if (lower.includes('косынка') || lower.includes('sol')) { openAppShell('Косынка', 'icon-file-exe', 'Раздайте колоду и начните игру.'); return }
  if (lower.includes('сапёр') || lower.includes('сапер')) { openMinesweeper(); return }
  if (lower.includes('пинбол')) { openAppShell('Пинбол', 'icon-file-exe', 'Pinball Space Cadet — нажмите F2 для новой игры.'); return }
  if (lower.includes('паук')) { openAppShell('Паук', 'icon-file-exe', 'Паук — выберите расклад.'); return }
  if (lower.includes('notes.txt')) { openNotepad(NOTES_EGG, 'notes.txt - Блокнот'); return }
  if (lower.includes('report.doc')) { openWordPad('Отчёт\n', 'report.doc - WordPad'); return }
  if (lower.includes('notes') || lower.includes('report')) {
    openExplorer(PATH_MY_DOCUMENTS)
    return
  }
  if (lower.includes('рисунки')) { openExplorer(PATH_MY_PICTURES); return }
  if (lower.includes('музыка')) { openExplorer(PATH_MY_MUSIC); return }
  if (lower.includes('сетевое')) { openExplorer(PATH_NETWORK); return }
  if (runProgram(name)) return
  void showMessage(`Не удается найти файл «${name}».\n\nПроверьте правильность имени и повторите попытку.`, name, 'error')
}

export { openFileByNode }
