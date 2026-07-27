import { escapeHtml } from '../utils/helpers'
import { windowManager } from './WindowManager'

const LOGO = '/Telegram_2019_Logo.svg.webp'
const BOT_URL = 'https://t.me/shorts_ytBot'

interface ChatMessage {
  time: string
  text: string
  link?: { label: string; href: string }
}

const MESSAGES: ChatMessage[] = [
  {
    time: '14:02',
    text: 'Привет! Я Vertix — Telegram-бот, который превращает длинное видео в готовые YouTube Shorts.',
  },
  {
    time: '14:02',
    text: 'Скидываешь ролик → получаешь клипы с субтитрами, озвучкой и обложкой. Без монтажа вручную.',
  },
  {
    time: '14:03',
    text: 'Умею сам находить лучшие моменты, писать хук в начало и заливать сразу на канал.',
  },
  {
    time: '14:03',
    text: 'Первые клипы — бесплатно. Хочешь попробовать?',
    link: { label: 'Открыть @shorts_ytBot', href: BOT_URL },
  },
]

export function openTelegram(): void {
  const root = document.createElement('div')
  root.className = 'telegram'

  root.innerHTML = `
    <aside class="telegram__sidebar">
      <div class="telegram__search">
        <input class="telegram__search-input xp-input" type="text" value="Поиск" readonly />
      </div>
      <button type="button" class="telegram__chat telegram__chat--active" data-chat="vertix">
        <img class="telegram__avatar" src="${LOGO}" width="42" height="42" alt="">
        <span class="telegram__chat-body">
          <span class="telegram__chat-top">
            <span class="telegram__chat-name">Vertix Bot</span>
            <span class="telegram__chat-time">14:03</span>
          </span>
          <span class="telegram__chat-preview">Первые клипы — бесплатно</span>
        </span>
      </button>
      <button type="button" class="telegram__chat" data-chat="support">
        <span class="telegram__avatar telegram__avatar--letter">S</span>
        <span class="telegram__chat-body">
          <span class="telegram__chat-top">
            <span class="telegram__chat-name">Поддержка XP</span>
            <span class="telegram__chat-time">вчера</span>
          </span>
          <span class="telegram__chat-preview">Обновление установлено успешно</span>
        </span>
      </button>
      <button type="button" class="telegram__chat" data-chat="system">
        <span class="telegram__avatar telegram__avatar--letter">!</span>
        <span class="telegram__chat-body">
          <span class="telegram__chat-top">
            <span class="telegram__chat-name">Telegram</span>
            <span class="telegram__chat-time">08.08</span>
          </span>
          <span class="telegram__chat-preview">Добро пожаловать в Telegram Desktop</span>
        </span>
      </button>
    </aside>
    <section class="telegram__main">
      <header class="telegram__header">
        <img class="telegram__header-avatar" src="${LOGO}" width="36" height="36" alt="">
        <div class="telegram__header-info">
          <div class="telegram__header-name">Vertix Bot</div>
          <div class="telegram__header-status">online</div>
        </div>
      </header>
      <div class="telegram__messages" data-role="messages">
        <div class="telegram__date">28 июля 2026</div>
        ${MESSAGES.map((msg) => `
          <div class="telegram__bubble">
            <div class="telegram__bubble-text">${escapeHtml(msg.text)}</div>
            ${msg.link ? `<a class="telegram__bubble-link" href="${escapeHtml(msg.link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(msg.link.label)}</a>` : ''}
            <div class="telegram__bubble-time">${escapeHtml(msg.time)}</div>
          </div>
        `).join('')}
      </div>
      <footer class="telegram__composer">
        <input class="telegram__composer-input xp-input" type="text" placeholder="Напишите сообщение..." data-role="input" />
        <button class="xp-btn xp-btn--default telegram__send" type="button" data-role="send">Отправить</button>
      </footer>
    </section>
  `

  const messagesEl = root.querySelector('[data-role="messages"]')!
  const inputEl = root.querySelector<HTMLInputElement>('[data-role="input"]')!

  const replies = [
    'Отличный выбор! Перейди в @shorts_ytBot и отправь боту любое видео.',
    'Shorts готовы за пару минут — с субтитрами, хуком и SEO-заголовком.',
    'Если нужна помощь — напиши @shorts_ytBot в настоящем Telegram 😉',
  ]
  let replyIndex = 0

  function appendReply(text: string): void {
    const bubble = document.createElement('div')
    bubble.className = 'telegram__bubble telegram__bubble--out'
    bubble.innerHTML = `
      <div class="telegram__bubble-text">${escapeHtml(text)}</div>
      <div class="telegram__bubble-time">${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}</div>
    `
    messagesEl.appendChild(bubble)
    messagesEl.scrollTop = messagesEl.scrollHeight
  }

  function sendMessage(): void {
    const text = inputEl.value.trim()
    if (!text) return
    appendReply(text)
    inputEl.value = ''
    window.setTimeout(() => {
      appendReply(replies[replyIndex % replies.length]!)
      replyIndex += 1
    }, 700)
  }

  root.querySelector('[data-role="send"]')!.addEventListener('click', sendMessage)
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage()
  })

  root.querySelectorAll<HTMLButtonElement>('.telegram__chat').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.telegram__chat').forEach((el) => el.classList.remove('telegram__chat--active'))
      btn.classList.add('telegram__chat--active')
    })
  })

  windowManager.open({
    title: 'Telegram',
    icon: '/Telegram_2019_Logo.svg.webp',
    width: 720,
    height: 480,
    content: root,
  })

  messagesEl.scrollTop = messagesEl.scrollHeight
}
