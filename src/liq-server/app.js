import * as path from 'path'

// import asyncHandler from 'express-async-handler'
import express from 'express'
import fileUpload from 'express-fileupload'
import findPlugins from 'find-plugins'

import { handlers } from './handlers'

const PLUGIN_LABEL = 'plugin:liq-core'

/**
* Options:
* - 'pluginPath': path to the directory containing the package of plugins. appInit expects to find 'package.json' whose
*     dependencies are the plugins to be loaded.
*/
const appInit = (options) => {
  const { model, reporter } = options
  const app = express()
  app.use(fileUpload({ parseNested: true }))
  
  options.cache = new WeakMap()

  app.handlers = []
  
  reporter.log('Loading core handlers...')
  registerHandlers(app, Object.assign({}, options, { sourcePkg:'@liquid-labs/liq-core', handlers }))
  
  loadPlugins(app, options)
  
  return app
}

// end "public" fuctions
// helper fuctions below

const pluginFilter = (pkgInfo) => pkgInfo.pkg.liq?.labels?.some((l) => l === PLUGIN_LABEL)

const defaultPluginPath = path.join(process.env.HOME, '.liq', 'plugins', 'core')

/**
*
*/
const loadPlugins = (app, { model, cache, reporter, skipCorePlugins = false, pluginPath = defaultPluginPath }) => {
  if (skipCorePlugins === true) {
    reporter.log('Skipping plugins.')
    return
  }
  
  const pluginPkg = path.join(pluginPath, 'package.json')
  const pluginDir = path.join(pluginPath, 'node_modules')
  reporter.log(`Searching for plugins (in ${path.dirname(pluginDir)})...`)
  const pluginOptions = {
    pkg: pluginPkg,
    dir: pluginDir,
    filter: () => true
  }
  
  const plugins = findPlugins(pluginOptions)
  
  reporter.log(plugins.length === 0 ? 'No plugins found.' : `Found ${plugins.length} plugins.`)
  
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

const registerHandlers = (app, { sourcePkg, handlers, model, reporter, setupData, cache }) => {
  for (const handler of handlers) {
    const { path, method, func } = handler
    if (path === undefined || method === undefined || func === undefined) {
      throw new Error(`A handler from '${sourcePkg}' does not fully define 'method', 'path', and/or 'func' exports.`)
    }
    const methodUpper = method.toUpperCase()
    reporter.log(`registering handler for path: ${methodUpper}:${path}`)
    // so express can find the handler
    app[method](path, func({ app, cache, model, reporter, setupData }))
    // for or own informational purposes
    app.handlers.push({ method: methodUpper, path: path.toString(), sourcePkg })
  }
}

export { appInit }
