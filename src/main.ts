import './styles/reset.css'
import './styles/xp.css'
import { Desktop } from './desktop/Desktop'

const app = document.querySelector<HTMLDivElement>('#app')!
new Desktop(app)
