import { appInit } from './app'
import { defaults, LIQ_PORT } from './defaults'
import { initializeConfiguration } from './lib/configurables'
import { model } from './model'
import * as server from './server'

// TODO: in future, we will process command line options (probably via bash) and pass in options from the command line
const config = initializeConfiguration([defaults/*, options */ ])

model.initialize(config)

const app = appInit(Object.assign({ model }, config))

const serverOptions = {
  PORT : config[LIQ_PORT],
  reporter : config.reporter || console
}

server.start({ app, options: serverOptions })
