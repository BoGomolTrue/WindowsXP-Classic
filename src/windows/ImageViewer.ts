import { findNode, type FSNode } from '../data/filesystem'
import { isImageFile } from '../data/media'
import { windowManager } from './WindowManager'

export interface ImageViewerOptions {
  title: string
  mediaUrl: string
  parentPath: string
  fileName: string
}

function imageSiblings(parentPath: string): FSNode[] {
  const parent = findNode(parentPath)
  if (!parent?.children) return []
  return parent.children.filter((c) => c.type === 'file' && isImageFile(c.name) && c.mediaUrl)
}

export function openImageViewer(opts: ImageViewerOptions): void {
  const root = document.createElement('div')
  root.className = 'imgview'

  const stage = document.createElement('div')
  stage.className = 'imgview__stage'
  const img = document.createElement('img')
  img.className = 'imgview__img'
  img.alt = opts.title
  stage.append(img)

  const bar = document.createElement('div')
  bar.className = 'imgview__bar'
  bar.innerHTML = `
    <button type="button" class="imgview__btn" data-act="zoom-in" title="Увеличить">+</button>
    <button type="button" class="imgview__btn" data-act="zoom-out" title="Уменьшить">−</button>
    <button type="button" class="imgview__btn" data-act="prev" title="Предыдущий">◀</button>
    <button type="button" class="imgview__btn" data-act="next" title="Следующий">▶</button>
  `

  root.append(stage, bar)

  let scale = 1
  let currentName = opts.fileName

  const applyScale = () => {
    img.style.transform = `scale(${scale})`
  }

  const showImage = (url: string, title: string, name: string) => {
    currentName = name
    scale = 1
    img.src = url
    applyScale()
    windowManager.setTitle(winId, title)
  }

  const siblingStep = (dir: -1 | 1) => {
    const siblings = imageSiblings(opts.parentPath)
    if (siblings.length <= 1) return
    const idx = siblings.findIndex((s) => s.name === currentName)
    if (idx < 0) return
    const next = siblings[(idx + dir + siblings.length) % siblings.length]!
    if (next.mediaUrl) showImage(next.mediaUrl, next.name, next.name)
  }

  stage.addEventListener('wheel', (e) => {
    e.preventDefault()
    scale = Math.min(4, Math.max(0.25, scale + (e.deltaY < 0 ? 0.15 : -0.15)))
    applyScale()
  }, { passive: false })

  bar.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.imgview__btn')
    if (!btn) return
    const act = btn.dataset.act
    if (act === 'zoom-in') {
      scale = Math.min(4, scale * 1.2)
      applyScale()
    } else if (act === 'zoom-out') {
      scale = Math.max(0.25, scale / 1.2)
      applyScale()
    } else if (act === 'prev') {
      siblingStep(-1)
    } else if (act === 'next') {
      siblingStep(1)
    }
  })

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') siblingStep(1)
    else if (e.key === 'ArrowLeft') siblingStep(-1)
    else if (e.key === '+' || e.key === '=') {
      scale = Math.min(4, scale * 1.2)
      applyScale()
    } else if (e.key === '-') {
      scale = Math.max(0.25, scale / 1.2)
      applyScale()
    }
  }

  const winId = windowManager.open({
    title: opts.title,
    icon: 'icon-pictures',
    width: 640,
    height: 480,
    resizable: true,
    content: root,
    onClose: () => document.removeEventListener('keydown', onKey),
  })

  document.addEventListener('keydown', onKey)
  showImage(opts.mediaUrl, opts.title, opts.fileName)
}
