import { app } from './app'
import { defaults, LIQ_PORT } from './defaults'
import { bindConfigSources } from './lib/configurables'

const start = (options = {}) => {
  const config = bindConfigSources([options, defaults])
  
  const PORT = config.getConfigurableValue(LIQ_PORT)

  const server = app.listen(PORT, (err) => {
    if (err) {
      console.error(`Error while starting server.\n${err}`)
      return
    } // else good to go!
    
    console.log(`liq server listening on ${PORT}`)
    console.log('Press Ctrl+C to quit.')
  })

  // support clean shutdown via sigterm
  process.on('SIGTERM', () => {
    server.close(() => {
      console.log('Server shut down.')
    })
  })
  
  return server
}

export { start }
