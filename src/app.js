import { existsSync, readFileSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import express from 'express'
import fileUpload from 'express-fileupload'
import findRoot from 'find-root'

import { DependencyRunner } from '@liquid-labs/dependency-runner'
import { readFJSON } from '@liquid-labs/federated-json'
import { PLUGABLE_REGISTRY } from '@liquid-labs/plugable-defaults'
import { WeakCache } from '@liquid-labs/weak-cache'

import { handlers } from './handlers'
import { findOwnHome } from './lib/find-own-home'
import { getServerSettings } from './lib/get-server-settings'
import { initServerSettings } from './lib/init-server-settings'
import { loadPlugins, registerHandlers } from './lib'
import { commonPathResolvers } from './lib/path-resolvers'
import { Reporter } from './lib/reporter'

const pkgRoot = findRoot(__dirname)
const pkgJSONContents = readFileSync(fsPath.join(pkgRoot, 'package.json'))
const pkgJSON = JSON.parse(pkgJSONContents)
const serverVersion = pkgJSON.version

/**
* Initializes the express app.
*
* Options:
* - `app` (opt): passed in when reloading
* - `serverHome` (required): runtime configuration and data directory (e.g., ~/.config/comply-server). Used for settings,
*    local configuration, and as the default dynamicPluginInstallDir.
* - `explicitPlugins` (opt): array of NPM package names to explicitly load as plugins, regardless of whether they have
*    the 'pluggable-endpoints' keyword. This supports transition from the previous separate plugins model. These plugins
*    are loaded in addition to keyword-discovered plugins.
* - `pluginPaths` (opt): additional (NPM package) directories from which to load additional plugins. This is in addition
*    to the plugins found in the server package directory, unless `skipCorePlugins` is true. This option is primarily
*    used for testing.
* - `skipCorePlugins` (opt): if true, then the plugins in the server package directory are NOT loaded. This option is
*    primarily used in conjunction with `pluginPaths` for testing.
* - `dynamicPluginInstallDir` (opt): optional directory to install dynamically loaded plugins. If not provided, plugins
*    are installed in the `serverHome` directory.
*/
const appInit = async(initArgs) => {
  let { app } = initArgs
  const {
    apiSpecPath,
    defaultRegistries = [PLUGABLE_REGISTRY()],
    explicitPlugins,
    name,
    noAPIUpdate = false,
    noRegistries,
    pluginPaths,
    dynamicPluginInstallDir,
    reporter = new Reporter(),
    serverHome = throw new Error("'serverHome' must be defined for appInit()."),
    skipCorePlugins = false,
    version
  } = initArgs

  // Find the server package root (where the running server's package.json is)
  // This is where core plugins are loaded from
  const serverPackageRoot = await findOwnHome(process.argv[1])

  app = app || express()

  app.use(express.json())
  app.use(express.urlencoded({ extended : true })) // handle POST body params
  app.use(fileUpload({ parseNested : true }))

  // setup app.ext
  app.ext = {
    commandPaths            : {},
    errorsEphemeral         : [],
    errorsRetained          : [],
    constants               : {}, // what is this? is it used?
    handlers                : [],
    handlerPlugins          : [],
    localSettings           : {},
    name,
    noRegistries,
    pathResolvers           : commonPathResolvers,
    pendingHandlers         : [],
    dynamicPluginInstallDir : dynamicPluginInstallDir || fsPath.join(serverHome, 'dynamic-plugins'),
    serverHome,
    serverSettings          : getServerSettings(serverHome),
    serverVersion,
    setupMethods            : [],
    teardownMethods         : [],
    version
  }

  // drop 'local-settings.yaml', it's really for the CLI, though we do currently keep 'OTP required' there, which is
  // itself incorrect as we should specify by registry
  const localSettingsPath = fsPath.join(serverHome, 'local-settings.yaml')
  if (existsSync(localSettingsPath)) {
    app.ext.localSettings = readFJSON(localSettingsPath)
  }
  // done setting app.ext

  // direct app extensions
  app.reload = async() => {
    app.router.stack = []
    await appInit(Object.assign({}, initArgs, { app }))
  }

  app.addSetupTask = (entry) => app.ext.setupMethods.push(entry)
  // end direct app extensions
  const cache = new WeakCache()
  // from here on out, we need to release the cache if we run into an exception which prevents us from returning it
  // (in which case it is the responsibility of the caller to release the cache)
  try {
    reporter.log('Loading core handlers...')
    registerHandlers(app, { cache, reporter, name : 'core', npmName : '@liquid-labs/plugable-express', handlers })

    if (skipCorePlugins !== true) {
      reporter.log(`Loading core plugins from '${serverPackageRoot}'...`)
      await loadPlugins(app, { cache, reporter, searchPath : serverPackageRoot, explicitPlugins })
    }

    // Also load plugins from dynamicPluginInstallDir if it's different from serverPackageRoot
    if (app.ext.dynamicPluginInstallDir !== serverPackageRoot) {
      reporter.log(`Loading dynamic plugins from '${app.ext.dynamicPluginInstallDir}'...`)
      await loadPlugins(app, { cache, reporter, searchPath : app.ext.dynamicPluginInstallDir, explicitPlugins })
    }

    if (pluginPaths?.length > 0) {
      for (const pluginDir of pluginPaths) {
        reporter.log(`Loading additional plugins from '${pluginDir}'...`)
        await loadPlugins(app, { cache, reporter, searchPath : pluginDir, explicitPlugins })
      }
    }

    for (const pendingHandler of app.ext.pendingHandlers) {
      pendingHandler()
    }

    // log errors
    app.use((error, req, res, next) => {
      const errors = app.ext.errorsEphemeral
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
      process.stderr.write(error.stack + '\n')
      if (error.cause) {
        process.stderr.write('Cause:\n' + error.cause.stack + '\n')
      }
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

    await initServerSettings({ defaultRegistries, noRegistries : app.ext.noRegistries, serverHome })
    app.ext.serverSettings = getServerSettings(serverHome)

    const depRunner = new DependencyRunner({ runArgs : { app, cache, reporter }, waitTillComplete : true })
    for (const setupMethod of app.ext.setupMethods) {
      depRunner.enqueue(setupMethod)
    }
    depRunner.complete()
    await depRunner.await()

    if (noAPIUpdate !== true) {
      reporter.log('Registering API...')
      const apiSpecFile = apiSpecPath || fsPath.join(serverHome, 'core-api.json')
      await fs.writeFile(apiSpecFile, JSON.stringify(app.ext.handlers, null, '  '))
    }

    return { app, cache }
  }
  catch (error) {
    cache.release()
    throw error
  }
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
