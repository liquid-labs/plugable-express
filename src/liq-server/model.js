import { loadPlayground } from './lib/load-playground'

const model = {
  /**
  * Initializes the model by loading the playground.
  */
  initialize : (options) => {
    model.playground = loadPlayground(options)

    // bind the original options to refreshPlayground
    model.refreshPlayground = () => {
      model.playground = loadPlayground(options)
      
      return model.playground
    }

    return model
  }
}

export { model }
