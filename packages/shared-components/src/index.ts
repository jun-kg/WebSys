import type { App } from 'vue'
import { CommonButton } from './components'

const components = {
  CommonButton
}

const install = (app: App) => {
  Object.entries(components).forEach(([name, component]) => {
    app.component(name, component)
  })
}

export {
  CommonButton,
  install
}

export default {
  install
}