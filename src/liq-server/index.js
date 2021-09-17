import { app } from './app'
import { defaults, LIQ_PORT } from './defaults'
import { initializeConfiguration } from './lib/configurables'
import { model } from './model'
import * as server from './server'

// TODO: in future, we will process command line options (probably via bash) and pass in options from the command line
const config = initializeConfiguration([/* options, */ defaults])

model.initialize(config)

app.initialize({ model })

const serverOptions = {
  PORT : config.get(LIQ_PORT)
}

server.start({ app, options: serverOptions })
