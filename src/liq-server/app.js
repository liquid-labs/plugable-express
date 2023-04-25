import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import express from 'express'
import fileUpload from 'express-fileupload'

import { readFJSON } from '@liquid-labs/federated-json'
import { WeakCache } from '@liquid-labs/weak-cache'

import { handlers } from './handlers'
import { loadPlugin, loadPlugins, registerHandlers } from './lib'
import { commonPathResolvers } from './lib/path-resolvers'

/**
*
*/
const appInit = async({ pluginDirs, skipCorePlugins = false, ...options }) => {
  const { model, reporter } = options
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended : true })) // handle POST body params
  app.use(fileUpload({ parseNested : true }))

  const cache = new WeakCache()
  options.cache = cache

  app.liq = {
    home       : () => process.env.LIQ_HOME || process.env.HOME + '/.liq',
    playground : () => app.liq.home() + '/playground'
  }

  Object.assign(
    app.liq,
    {
      commandPaths    : {},
      errorsEphemeral : [],
      errorsRetained  : [],
      constants       : {}
    })

  app.liq.handlers = []

  app.liq.commandPaths = {}
  app.liq.addCommandPath = (commandPath, parameters) => {
    let frontier = app.liq.commandPaths
    for (const pathBit of commandPath) {
      if (!(pathBit in frontier)) {
        frontier[pathBit] = {}
      }
      frontier = frontier[pathBit]
    }

    if (frontier._parameters !== undefined) {
      throw new Error(`Non-unique command path: ${commandPath.join('/')}`)
    }

    // 'parameters' are deep frozen, so safe to share. We use a function here to future proof in case we need to
    // unfreeze and then maybe make copies here to prevent clients from changing the shared parameters data.
    frontier._parameters = () => parameters
  }

  app.liq.pathResolvers = commonPathResolvers

  // TODO: this causes a race condition; should instead just try to read with federated JSON and ignore 'file not
  // found' exceptions
  const localSettingsPath = fsPath.join(app.liq.home(), 'local-settings.yaml')
  if (existsSync(localSettingsPath)) {
    app.liq.localSettings = readFJSON(localSettingsPath)
  }
  else {
    app.liq.localSettings = {}
  }

  reporter.log('Loading core handlers...')
  registerHandlers(app, Object.assign({}, options, { sourcePkg : '@liquid-labs/liq-core', handlers }))

  if (skipCorePlugins !== true) {
    await loadPlugins(app, options)
  }
  if (pluginDirs?.length > 0) {
    for (const pluginDir of pluginDirs) {
      const packageJSON = JSON.parse(await fs.readFile(fsPath.join(pluginDir, 'package.json'), { encoding : 'utf8' }))
      await loadPlugin({ app, cache, model, reporter, dir : pluginDir, pkg : packageJSON })
    }
  }

  // log errors
  app.use((error, req, res, next) => {
    const errors = app.liq.errorsEphemeral
    const errorID = makeID()
    error.liqID = errorID
    errors.push({
      id        : errorID,
      message   : error.message,
      stack     : error.stack,
      timestamp : new Date().getTime()
    })
    let i = 0
    while (errors.length > 1000 && i < errors.length) {
      errors.shift()
      i += 1
    }
    console.error(error)
    next(error)
  })
  // generate user response
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)

    const status = error.status || 500
    res.status(status)

    const errorSource = status >= 400 && status < 500
      ? 'Client'
      : status >= 500 && status < 600
        ? 'Server'
        : 'Unknown'
    let msg = `<error>${errorSource} error ${status}: ${statusText[status]}<rst>\n\n<em>${error.message}<rst>\n\n`
    // if the error stack isn't registered, we display it here
    if (error.liqID === undefined && error.stack) {
      msg += error.stack
    }
    else {
      msg += 'error ref: <code>/server/errors/' + error.liqID + '<rst>'
    }

    if (req.accepts('html')) {
      next(error) // defer to default error handling
    }
    else {
      if (req.accepts('text/terminal')) {
        res.setHeader('content-type', 'text/terminal')
      }
      else {
        msg = msg.replaceAll(/<[a-z]+>/g, '')
        res.setHeader('content-type', 'text/plain')
      }
      res.send(msg)
    }
  })

  return { app, cache }
}

// TODO: credit from stackoverflow...
const makeID = (length = 5) => {
  let result = ''
  // notice no 'l' or '1'
  const characters = 'abcdefghijkmnopqrstuvwxyz023456789'
  const charactersLength = characters.length
  let counter = 0
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
    counter += 1
  }
  return result
}

const statusText = {
  400 : 'BadRequest',
  401 : 'Unauthorized',
  402 : 'PaymentRequired',
  403 : 'Forbidden',
  404 : 'NotFound',
  405 : 'MethodNotAllowed',
  406 : 'NotAcceptable',
  407 : 'ProxyAuthenticationRequired',
  408 : 'RequestTimeout',
  409 : 'Conflict',
  410 : 'Gone',
  411 : 'LengthRequired',
  412 : 'PreconditionFailed',
  413 : 'PayloadTooLarge',
  414 : 'URITooLong',
  415 : 'UnsupportedMediaType',
  416 : 'RangeNotSatisfiable',
  417 : 'ExpectationFailed',
  418 : 'ImATeapot',
  421 : 'MisdirectedRequest',
  422 : 'UnprocessableEntity',
  423 : 'Locked',
  424 : 'FailedDependency',
  425 : 'TooEarly',
  426 : 'UpgradeRequired',
  428 : 'PreconditionRequired',
  429 : 'TooManyRequests',
  431 : 'RequestHeaderFieldsTooLarge',
  451 : 'UnavailableForLegalReasons',
  500 : 'InternalServerError',
  501 : 'NotImplemented',
  502 : 'BadGateway',
  503 : 'ServiceUnavailable',
  504 : 'GatewayTimeout',
  505 : 'HTTPVersionNotSupported',
  506 : 'VariantAlsoNegotiates',
  507 : 'InsufficientStorage',
  508 : 'LoopDetected',
  509 : 'BandwidthLimitExceeded',
  510 : 'NotExtended',
  511 : 'NetworkAuthenticationRequired'
}

export { appInit }
