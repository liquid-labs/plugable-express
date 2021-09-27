// import asyncHandler from 'express-async-handler'
import express from 'express'
import findPlugins from 'find-plugins'

import { handlers } from './handlers'

const appInit = ({ model, reporter = console, pluginOptions = {}, skipPlugins }) => {
  const app = express()
  const cache = new WeakMap()

  app.initialized = false

  const registerHandlers = ({ name, handlers, model, reporter }) => {
    for (const handler of handlers) {
      const { path, verb, func } = handler
      if (path === undefined || verb === undefined || func === undefined) {
        throw new Error(`A handler from '${name}' does not fully define 'verb', 'path', and/or 'func' exports.`)
      }
      reporter.log(`registering handler for path: ${verb.toUpperCase()}:${path}`)
      app[verb](path, func({ cache, model, reporter }))
    }
  }

  reporter.error('skipPlugins', skipPlugins)
  reporter.log('Loading core handlers...')
  registerHandlers({ name:'core', handlers, model, reporter })
  
  reporter.log('Searching for plugins...')
  pluginOptions = Object.assign({
      excludeDependencies: true,
      includeOptional: true,
      filter: (pkgInfo) => pkgInfo.pkg.liq?.packageType === 'plugin:liq-core'
    },
    pluginOptions
  )
  if (!skipPlugins) {
    const plugins = findPlugins(pluginOptions)
    for (const plugin of plugins) {
      const pluginName = plugin.pkg.name
      reporter.log(`Loading plugins from ${pluginName}...`)
      const handlers = require(plugin.dir).handlers
      if (handlers === undefined) {
        throw new Error(`'liq-core' plugin '${pluginName}' does not export 'handlers'; bailing out.`)
      }
      
      registerHandlers({ name:pluginName, handlers, model, reporter })
    }
  
    app.plugins = plugins
  }
  else {
    app.plugins = []
  }
  
  return app
}

export { appInit }
