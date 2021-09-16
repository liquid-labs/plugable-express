import { loadPlayground } from './lib/load-playground'

const model = {}

loadPlayground(model)

model.refreshPlayground = () => {
  loadPlayground(config)
}

export { model }
