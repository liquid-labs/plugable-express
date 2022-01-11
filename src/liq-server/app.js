// import asyncHandler from 'express-async-handler'
import express from 'express'
import fileUpload from 'express-fileupload'
import findPlugins from 'find-plugins'

import { handlers } from './handlers'

const PLUGIN_LABEL = 'plugin:liq-core'

const appInit = (options) => {
  const { model, reporter } = options
  const app = express()
  app.use(fileUpload({ parseNested: true }))
  
  options.cache = new WeakMap()

  app.handlers = []
  
  reporter.log('Loading core handlers...')
  registerHandlers(app, Object.assign({}, options, { sourcePkg:'@liquid-labs/liq-core', handlers }))
  
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
  processPlugins(app, options, pluginOptions)
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

const pluginFilter = (pkgInfo) => pkgInfo.pkg.liq?.labels?.some((l) => l === PLUGIN_LABEL)

const registerHandlers = (app, { sourcePkg, handlers, model, reporter, setupData, cache }) => {
  for (const handler of handlers) {
    const { path, method, func } = handler
    if (path === undefined || method === undefined || func === undefined) {
      throw new Error(`A handler from '${sourcePkg}' does not fully define 'method', 'path', and/or 'func' exports.`)
    }
    reporter.log(`registering handler for path: ${method.toUpperCase()}:${path}`)
    // so express can find the handler
    app[method](path, func({ app, cache, model, reporter, setupData }))
    // for or own informational purposes
    app.handlers.push({ method, path: path.toString(), sourcePkg })
  }
}

const processPlugins = (app, { reporter, model, cache }, pluginOptions) => {
  const plugins = findPlugins(pluginOptions)
  
  console.log(plugins.length === 0 ? 'No plugins found.' : `Found ${plugins.length} plugins.`)
  
  for (const plugin of plugins) {
    const sourcePkg = plugin.pkg.name
    reporter.log(`Loading plugins from ${sourcePkg}...`)
    const { handlers, setup } = require(plugin.dir) || {}
    if (handlers === undefined && setup === undefined) {
      throw new Error(`'liq-core' at least one plugin from '${sourcePkg}' does not export 'handlers' or 'setup'; bailing out.`)
    }
    
    if (setup) reporter.log(`Running setup for ${sourcePkg} plugins...`)
    const setupData = setup ? setup({ model, reporter }) : {}
    
    if (handlers !== undefined) {
      registerHandlers(app, { sourcePkg, handlers, model, reporter, setupData, cache })
    }
  }
}

export { appInit }
