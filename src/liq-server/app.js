import * as path from 'path'

// import asyncHandler from 'express-async-handler'
import chalk from 'chalk'
import express from 'express'
import fileUpload from 'express-fileupload'

import { handlers } from './handlers'
import { loadPlugins, registerHandlers } from './lib'

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
  
  options.cache = new WeakMap()

  app.handlers = []
  app.helpData = {}
  
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
  
  return app
}

export { appInit }
