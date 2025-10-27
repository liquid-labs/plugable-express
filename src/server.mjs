import { Reporter } from './lib/reporter'

const startServer = async({
  appInit, // the init function
  name,
  reporter, // customized reporter
  // the rest are app options
  port
}) => {
  reporter = reporter || new Reporter()

  if (!port) {
    throw new Error("No 'port' provided; bailing out.")
  }

  const { app, cache } = await appInit({ reporter })

  const server = app.listen(port, (err) => {
    if (err) {
      reporter.error(`Error while starting ${name} server.\n${err}`)
      return
    } // else good to go!

    reporter.log(`Server listening on ${port}`)
    reporter.log('Press Ctrl+C to quit.')
  })

  // support clean shutdown via sigterm
  process.on('SIGTERM', () => {
    server.close(() => {
      cache.release()
      reporter.log('Server shut down.')
    })

    // see https://github.com/liquid-labs/plugable-express/issues/211
    process.exit()
  })

  return server
}

export { startServer }
