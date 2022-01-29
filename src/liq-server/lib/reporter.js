const outputMethodNames = [
  'debug',
  'error',
  'info',
  'log',
  'table',
  'warn'
]

const initReporter = (configOptions) => {
  const reporter = {
    configure : (options) => {
      const { configuration } = reporter
      reporter.configuration = Object.assign(configuration, options)
    },
    configuration : { silent : false }
  }

  if (configOptions) {
    reporter.configure(configOptions)
  }

  for (const methodName of outputMethodNames) {
    reporter[methodName] = (...msgs) => {
      if (!reporter.configuration.silent) {
        console[methodName](...msgs)
      }
    }
  }

  return reporter
}

export { initReporter }
