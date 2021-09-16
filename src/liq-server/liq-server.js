import asyncHandler from 'express-async-handler'
import express from 'express'

import { defaults, LIQ_PORT } from './defaults'
import { bindConfigSources } from './lib/configurables'

const startServer = (config) => {
  const PORT = config.getConfigurableValue(LIQ_PORT)
  const app = express()
  
  app.listen(PORT, (err) => {
    if (err) {
      console.error(`Error while starting server.\n${err}`)
      return
    } // else good to go!
    
    console.log(`liq server listening on ${PORT}`)
    console.log('Press Ctrl+C to quit.')
  })
}

const startLiqServer = (options = {}) => {
  const config = bindConfigSources([options, defaults])
  
  startServer(config)
}

export { startLiqServer }
