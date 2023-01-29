import express from 'express'
import fileUpload from 'express-fileupload'

import { WeakCache } from '@liquid-labs/weak-cache'

import { handlers } from './handlers'
import { loadPlugins, registerHandlers } from './lib'
import { commonPathResolvers } from './lib/path-resolvers'

/**
* Options:
* - 'pluginPath': path to the directory containing the package of plugins. appInit expects to find 'package.json' whose
*     dependencies are the plugins to be loaded.
*/
const appInit = ({ skipCorePlugins = false, ...options }) => {
  const { reporter } = options
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended : true })) // handle POST body params
  app.use(fileUpload({ parseNested : true }))

  const cache = new WeakCache()
  options.cache = cache


  app.liq = {}
  
  app.handlers = []

  app.liq.commandPaths = {}
  app.addCommandPath = (commandPath, parameters) => {
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

  app.commonPathResolvers = commonPathResolvers
  app.addCommonPathResolver = (key, resolver) => {
    // TODO: It's a good check to avoid hard to debug bugs, but runs afoul of re-loads (or something...)
    /* if (key in commonPathResolvers) {
      throw new Error(`'${key}' is already registered as a path resolver.`)
    } */
    commonPathResolvers[key] = resolver
  }

  app.liqHome = () => process.env.LIQ_HOME || process.env.HOME + '/.liq'
  app.liqPlayground = () => app.liqHome() + '/playground'

  reporter.log('Loading core handlers...')
  registerHandlers(app, Object.assign({}, options, { sourcePkg : '@liquid-labs/liq-core', handlers }))

  if (!skipCorePlugins) {
    loadPlugins(app, options)
  }

  // log errors
  app.use((error, req, res, next) => {
    console.log(error)
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
    let msg = `<error>Client error ${status}: ${statusText[status]}<rst>\n\n${error.message}`
      + (error.stack ? '\n\n' + error.stack : '')

    if (req.accepts('text/terminal')) {
      res.setHeader('content-type', 'text/terminal')
    }
    else {
      msg = msg.replaceAll(/<[a-z]+>/g, '')
      res.setHeader('content-type', 'text/plain')
    }
    res.send(msg)
  })

  return { app, cache }
}

const statusText = {
  400: 'BadRequest',
  401: 'Unauthorized',
  402: 'PaymentRequired',
  403: 'Forbidden',
  404: 'NotFound',
  405: 'MethodNotAllowed',
  406: 'NotAcceptable',
  407: 'ProxyAuthenticationRequired',
  408: 'RequestTimeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'LengthRequired',
  412: 'PreconditionFailed',
  413: 'PayloadTooLarge',
  414: 'URITooLong',
  415: 'UnsupportedMediaType',
  416: 'RangeNotSatisfiable',
  417: 'ExpectationFailed',
  418: 'ImATeapot',
  421: 'MisdirectedRequest',
  422: 'UnprocessableEntity',
  423: 'Locked',
  424: 'FailedDependency',
  425: 'TooEarly',
  426: 'UpgradeRequired',
  428: 'PreconditionRequired',
  429: 'TooManyRequests',
  431: 'RequestHeaderFieldsTooLarge',
  451: 'UnavailableForLegalReasons',
  500: 'InternalServerError',
  501: 'NotImplemented',
  502: 'BadGateway',
  503: 'ServiceUnavailable',
  504: 'GatewayTimeout',
  505: 'HTTPVersionNotSupported',
  506: 'VariantAlsoNegotiates',
  507: 'InsufficientStorage',
  508: 'LoopDetected',
  509: 'BandwidthLimitExceeded',
  510: 'NotExtended',
  511: 'NetworkAuthenticationRequired'
}

export { appInit }
