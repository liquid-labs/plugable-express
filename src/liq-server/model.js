import { loadPlayground, loadOrgs } from './lib'

const model = {
  /**
  * Initializes the model by loading the playground.
  */
  initialize : (options) => {
    model.playground = loadPlayground(options)
    const orgsOptions = Object.assign({ playground: model.playground }, options)
    model.orgs = loadOrgs(orgsOptions)

    // bind the original options to refreshPlayground
    model.refreshPlayground = () => {
      model.playground = loadPlayground(options)
      
      return model.playground
    }

    return model
  }
}

export { model }
