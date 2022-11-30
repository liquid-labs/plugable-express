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
import { model } from './model'
import * as server from './server'

const config = initializeConfiguration([defaults/*, options */ ])

model.initialize(config)

const { app, cache } = appInit(Object.assign({ model }, config))

const serverOptions = {
  PORT : config[LIQ_PORT],
  reporter : config.reporter || console
}

server.start({ app, cache, options: serverOptions })
