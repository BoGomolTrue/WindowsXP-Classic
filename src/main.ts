import './styles/reset.css'
import './styles/boot.css'
import './styles/xp.css'
import { installSprite } from './utils/helpers'
import { runBootSequence, showWelcomeOverlay } from './ui/boot'
import { Desktop } from './desktop/Desktop'

installSprite()

async function boot(): Promise<void> {
  await runBootSequence()
  const app = document.querySelector<HTMLDivElement>('#app')!
  new Desktop(app)
  await showWelcomeOverlay()
}

boot()
