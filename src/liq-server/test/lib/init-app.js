import * as fs from 'fs'
import * as path from 'path'

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

const bits = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'))
const packageJSON = JSON.parse(bits)
const CURR_VER=packageJSON.version

export { app, model, initApp, CURR_VER }
