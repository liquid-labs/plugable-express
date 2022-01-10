// import asyncHandler from 'express-async-handler'
import express from 'express'
import fileUpload from 'express-fileupload'
import findPlugins from 'find-plugins'

import { handlers } from './handlers'

const appInit = (options) => {
  const { model, reporter = console } = options
  const app = express()
  app.use(fileUpload({ parseNested: true }))
  
  options.cache = new WeakMap()

  reporter.log('Loading core handlers...')
  registerHandlers(app, { name:'core', handlers, model, reporter, cache: options.cache })
  
  app.plugins = []
  loadOptionalCorePlugins(app, options)
  loadCustomPlugins(app, options)
  
  return app
}

// end "public" fuctions
// helper fuctions below

/**
*
*/
const loadOptionalCorePlugins = (app, options) => {
  const { reporter, skipCorePlugins = false } = options
  if (skipCorePlugins === true) {
    reporter.log('Skipping core plugins.')
    return
  }
  
  reporter.log('Searching for optional core plugins...')
  const pluginOptions = {
    excludeDependencies: true,
    includeOptional: true,
    filter: pluginFilter
  }
  processPlugins(app, options)
}

const loadCustomPlugins = (app, options) => {
  const { reporter, customPlugins } = options
  if (!customPlugins?.length || customPlugins.length === 0) {
    reporter.log('No custom plugins defined.')
    return
  }
  
  reporter.log('Searching for custom plugins...')
  
  for (const pluginDir of customPlugins) {
    const pluginOptions = {
      dir         : pluginDir,
      scanAllDirs : true,
      filter: pluginFilter
    }
    processPlugins(app, options, pluginOptions)
  }
}

const pluginFilter = (pkgInfo) => pkgInfo.pkg.liq?.labels?.some((l) => l === 'plugin:liq-core')

const registerHandlers = (app, { name, handlers, model, reporter, setupData, cache }) => {
  for (const handler of handlers) {
    const { path, verb, func } = handler
    if (path === undefined || verb === undefined || func === undefined) {
      throw new Error(`A handler from '${name}' does not fully define 'verb', 'path', and/or 'func' exports.`)
    }
    reporter.log(`registering handler for path: ${verb.toUpperCase()}:${path}`)
    app[verb](path, func({ cache, model, reporter, setupData }))
  }
}

const processPlugins = (app, { reporter = console, model, cache }, pluginOptions) => {
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
      registerHandlers(app, { name:pluginName, handlers, model, reporter, setupData, cache })
    }
  }

  app.plugins.push(...plugins)
}

export { appInit }
