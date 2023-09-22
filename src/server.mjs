import commandLineArgs from 'command-line-args'

import { Reporter } from './lib/reporter'

const startServer = async({
  appInit, // the init function
  reporter, // customized reporter
  // the rest are app options
  apiSpecPath,
  configDir,
  defaultRegistries,
  name,
  pluginPaths,
  pluginsPath,
  port,
  serverHome
}) => {
  const optionsSpec = [
    { name : 'api-spec-path', type : String },
    { name : 'name', type : String },
    { name : 'plugin-paths', type : String, multiple : true },
    { name : 'plugins-path', type : String },
    { name : 'port', type : parseInt },
    { name : 'server-home', type : String }
  ]

  const options = commandLineArgs(optionsSpec)

  apiSpecPath = options['api-spec-path'] || apiSpecPath
  name = options.name || name
  pluginPaths = options['plugin-paths'] || pluginPaths
  pluginsPath = options['plugins-path'] || pluginsPath
  port = options.port || port
  serverHome = options['server-home'] || serverHome

  reporter = reporter || new Reporter()

  if (!port) {
    throw new Error("No 'port' provided; bailing out.")
  }

  const { app, cache } = await appInit({ configDir, defaultRegistries, pluginPaths, pluginsPath, reporter, serverHome })

  const server = app.listen(port, (err) => {
    if (err) {
      reporter.error(`Error while starting ${name} server.\n${err}`)
      return
    } // else good to go!

    reporter.log(`liq server listening on ${port}`)
    reporter.log('Press Ctrl+C to quit.')
  })

  // support clean shutdown via sigterm
  process.on('SIGTERM', () => {
    server.close(() => {
      cache.release()
      reporter.log('Server shut down.')
    })
  })

  return server
}

export { startServer }
