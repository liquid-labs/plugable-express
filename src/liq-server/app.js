// import asyncHandler from 'express-async-handler'
import express from 'express'
import fileUpload from 'express-fileupload'
import findPlugins from 'find-plugins'

import { handlers } from './handlers'

const appInit = ({ model, reporter = console, pluginOptions = {}, skipPlugins }) => {
  const app = express()
  app.use(fileUpload({ parseNested: true }))
  
  const cache = new WeakMap()

  const registerHandlers = ({ name, handlers, model, reporter, setupData }) => {
    for (const handler of handlers) {
      const { path, verb, func } = handler
      if (path === undefined || verb === undefined || func === undefined) {
        throw new Error(`A handler from '${name}' does not fully define 'verb', 'path', and/or 'func' exports.`)
      }
      reporter.log(`registering handler for path: ${verb.toUpperCase()}:${path}`)
      app[verb](path, func({ cache, model, reporter, setupData }))
    }
  }

  reporter.log('Loading core handlers...')
  registerHandlers({ name:'core', handlers, model, reporter })
  
  if (!skipPlugins) {
    reporter.log('Searching for plugins...')
    pluginOptions = Object.assign({
        excludeDependencies: true,
        includeOptional: true,
        filter: (pkgInfo) => pkgInfo.pkg.liq?.labels?.some((l) => l === 'plugin:liq-core')
      },
      pluginOptions
    )
    
    const plugins = findPlugins(pluginOptions)
    
    for (const plugin of plugins) {
      const pluginName = plugin.pkg.name
      reporter.log(`Loading plugins from ${pluginName}...`)
      const { handlers, setup } = require(plugin.dir) || {}
      if (handlers === undefined && setup === undefined) {
        throw new Error(`'liq-core' plugin '${pluginName}' does not export 'handlers' or 'setup'; bailing out.`)
      }
      
      if (setup) reporter.log(`Running setup for ${pluginName}...`)
      const setupData = setup ? setup({ model, reporter }) : {}
      
      if (handlers !== undefined) {
        registerHandlers({ name:pluginName, handlers, model, reporter, setupData })
      }
    }
  
    app.plugins = plugins
  }
  else {
    reporter.log('Skipping plugin search.')
    app.plugins = []
  }
  
  return app
}

export { appInit }
