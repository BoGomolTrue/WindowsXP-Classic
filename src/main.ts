import './styles/reset.css'
import './styles/xp.css'
import { installSprite } from './utils/helpers'
import { Desktop } from './desktop/Desktop'

installSprite()

const app = document.querySelector<HTMLDivElement>('#app')!
new Desktop(app)
