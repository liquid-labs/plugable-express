/**
* Launches app. Takes no arguments but may be configured via environment variables.
*
* Environment variables:
* - `LIQ_PLAYGROUND_PATH`: path to root of playground to search for organization projects.
* - `LIQ_PLUGIN_PATH`: path to search for plugins. Plugins are a NPM project, with `package.json` including all plugins.
*/
import { appInit } from './app'
import { defaults, LIQ_PORT } from './defaults'
import { initializeConfiguration } from './lib/configurables'
import { initServerSettings } from './lib/init-server-settings'
import { Reporter } from './lib/reporter'
import { initModel } from './model'
import * as server from './server'

const action = process.argv[2]

if (action === 'liq-server:run') {
  const config = initializeConfiguration([defaults]);

  (async() => {
    const model = initModel()
    const { app, cache } = await appInit(Object.assign({ model, noAPIUpdate: true }, config))
    app.liq.config = config

    const serverOptions = {
      PORT     : config[LIQ_PORT],
      reporter : config.reporter || console
    }

    server.start({ app, cache, options : serverOptions })
  })()
}
else if (action === 'liq-server:init') {
  initServerSettings({ reAsk : true })
}

export { appInit, initModel, Reporter }
