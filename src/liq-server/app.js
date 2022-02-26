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

const pathParamRegExp = /:[^/ ][^/]*/g

const registerHandlers = (app, { sourcePkg, handlers, model, reporter, setupData, cache }) => {
  for (const handler of handlers) {
    // TODO: make use of 'pathParams' and ensure conformity between the path definition and our defined pathParams
    const { func, method, parameters, path/*, pathParams*/ } = handler
    if (path === undefined || method === undefined || func === undefined) {
      throw new Error(`A handler from '${sourcePkg}' does not fully define 'method', 'path', and/or 'func' exports.`)
    }
    const methodUpper = method.toUpperCase()
    reporter.log(`registering handler for path: ${methodUpper}:${path}`)
    // so express can find the handler
    app[method](path, func({ app, cache, model, reporter, setupData }))
    // for or own informational purposes
    const endpointDef = Object.assign({}, handler)

    // convet the path to a more easily interogated data structure
    let pathString
    endpointDef.path = { value: path.toString() }
    if (path instanceof RegExp) {
      pathString = `RE: /${path.source}/${path.flags}`
      endpointDef.path.isRegexp = true
    }
    else {
      pathString = path
    }
    
    if (!parameters) {
      reporter.warn(`Endpoint '${pathString}' does not define 'parameters'. An explicit '[]' value should be defined where there are no parameters.`)
      parameters = []
      endpointDef.parameters = parameters
    }
    let i = 0
    for (const pathParam of pathString.match(pathParamRegExp) || []) {
      const paramName = pathParam.substring(1)
      let paramDef = parameters.find((p) => p.name === paramName)
      if (paramDef === undefined) {
        paramDef = { name: paramName }
        parameters.push(paramDef) // TODO: I assume pushing and sorting more is quicker than unshift and sorting less
      }
      paramDef.required = true
      paramDef.inPath = true
      paramDef.position = i
      paramDef.isSingleValue = true
      i += 1
    }
    
    for (const paramDef of parameters) {
      if (paramDef.inPath === undefined && paramDef.inQuery === undefined) {
        paramDef.inQuery = true
      }
    }

    endpointDef.parameters.sort((a, b) => {
      if (a.inPath === true && b.inQuery === true) {
        return 1
      }
      else if (a.inPath === true && b.inQuery === true) {
        return -1
      }
      else if (a.inPath) /* sort by position */ return a.position > b.position ? 1 : -1 // position is never equal
      else /* query param; sort by name */ return a.name.localeCompare(b.name)
    })

    // a little cleanup and annotation
    endpointDef.method = methodUpper
    delete endpointDef.func
    endpointDef.sourcePkg = sourcePkg // do this here so it shows up at the end of the obj
    
    app.handlers.push(endpointDef)
  }
}

export { appInit }
