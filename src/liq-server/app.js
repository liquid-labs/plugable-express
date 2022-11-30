import * as path from 'path'

import chalk from 'chalk'
import express from 'express'
import fileUpload from 'express-fileupload'

import { WeakCache } from '@liquid-labs/weak-cache'

import { handlers } from './handlers'
import { loadPlugins, registerHandlers } from './lib'
import { commonPathResolvers } from './lib/path-resolvers'

const PLUGIN_LABEL = 'plugin:liq-core'

/**
* Options:
* - 'pluginPath': path to the directory containing the package of plugins. appInit expects to find 'package.json' whose
*     dependencies are the plugins to be loaded.
*/
const appInit = ({ skipCorePlugins = false, ...options }) => {
  const { model, reporter } = options
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true })) // handle POST body params
  app.use(fileUpload({ parseNested: true }))
  
  const cache = new WeakCache()
  options.cache = cache
  
  app.handlers = []
  app.helpData = {}
  
  app.commandPaths = {}
  app.addCommandPath = (commandPath, parameters) => {
    let frontier = app.commandPaths
    for (const pathBit of commandPath) {
      if (!(pathBit in frontier)) {
        frontier[pathBit] = {}
      }
      frontier = frontier[pathBit]
    }
    
    if (frontier['_parameters'] !== undefined) {
      throw new Error(`Non-unique command path: ${commandPath.join('/')}`)
    }
    
    // 'parameters' are deep frozen, so safe to share. We use a function here to future proof in case we need to
    // unfreeze and then maybe make copies here to prevent clients from changing the shared parameters data.
    frontier._parameters = () => parameters
  }
  
  app.commonPathResolvers = commonPathResolvers
  app.addCommonPathResolver = (key, resolver) => {
    if (key in commonPathResolvers) {
      throw new Error(`'${key}' is already registered as a path resolver.`)
    }
    commonPathResolvers[key] = resolver
  }
  
  reporter.log('Loading core handlers...')
  registerHandlers(app, Object.assign({}, options, { sourcePkg:'@liquid-labs/liq-core', handlers }))
  
  app.help = (nickName, format, res) => {
    if (!(nickName in app.helpData)) {
      throw new Error('Very unexpectedly found no help.')
    }
    const [ description, parameters ] = app.helpData[nickName]
    
    if (format === true || format === 'true') {
      format = 'cli'
    }
    
    // TODO: support other formats
    if (format === 'cli') {
      let result = ''
      if (description !== undefined) {
        result += chalk.bold.greenBright('Description:\n')
          + description + '\n\n'
          + chalk.bold.greenBright('Parameters:')
      }
      for (const param of parameters) {
        result += '\n' + chalk.bold.red(param.name) + `: (${chalk.yellow(param.inPath ? 'path' : 'query' )}, ${chalk.yellow(param.required ? 'req' : 'opt' )}) ` + param.description + '\n'
      }
      res.send(result)
    }
    else {
      throw new Error(`Unkonwn help format '${format}'.`)
    }
  }
  
  if (!skipCorePlugins) {
    loadPlugins(app, options)
  }
  
  return { app, cache }
}

export { appInit }
