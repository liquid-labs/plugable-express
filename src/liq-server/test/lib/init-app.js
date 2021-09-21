import { app } from '../../app'
import { model } from '../../model'
import { reporter, simplePlaygroundPath } from './test-utils'

const initApp = ({ force=false, playgroundPath=simplePlaygroundPath } = {}) => {
  if (!app.initialized || force) {
    model.initialize({
      LIQ_PLAYGROUND_PATH : playgroundPath,
      reporter
    })
    app.initialize({ model, reporter })
  }
}

export { app, model, initApp }
