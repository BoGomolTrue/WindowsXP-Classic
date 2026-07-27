export const NOTES_EGG = `Заметки пользователя
====================

- смонтировать подкаст (127 мин!)
- попробовать нарезку в телеге
- не забыть про 9:16
`

export const BOOT_INI_EGG = `[boot loader]
timeout=30
default=multi(0)disk(0)rdisk(0)partition(1)\\WINDOWS

[operating systems]
multi(0)disk(0)rdisk(0)partition(1)\\WINDOWS="Microsoft Windows XP Professional" /fastdetect
; aspect=9:16
`

export const ABOUT_EASTER_HTML = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Справка</title><style>
body{font:13px Tahoma,Verdana,sans-serif;margin:24px;background:#fff;color:#000;max-width:520px}
h1{font-size:16px;font-weight:bold;margin:0 0 12px}
p{margin:0 0 10px;line-height:1.45}
.note{border:1px solid #808080;background:#ffffe1;padding:10px 12px;margin-top:16px;font-size:12px;color:#333}
</style></head><body>
<h1>Нарезка длинного видео</h1>
<p>Если у вас два часа материала и нужны короткие клипы — это делается быстрее, чем кажется.</p>
<p>Отправьте видео в Telegram, выберите режим, подождите. Формат 9:16 и субтитры — на стороне сервиса.</p>
<div class="note">Вы нашли скрытую страницу. Это всё, что здесь написано.</div>
</body></html>`

export const RUN_916_HINT = 'Did you mean 9:16?'

export function showToast(text: string, ms = 2200): void {
  const el = document.createElement('div')
  el.className = 'xp-toast'
  el.textContent = text
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('xp-toast--show'))
  window.setTimeout(() => {
    el.classList.remove('xp-toast--show')
    window.setTimeout(() => el.remove(), 300)
  }, ms)
}

export function isAspectRatioRun(input: string): boolean {
  const t = input.trim().replace(/\s/g, '')
  return t === '916' || t === '9:16' || t === '9/16'
}
