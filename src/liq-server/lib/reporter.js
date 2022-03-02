// import clc from 'chalk'

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
      if (reporter.configuration.silent) return
      // else, not silent
      /*
      if (methodName === 'debug') msgs = msgs.map(s => clc.bold(s))
      else if (methodName === 'error') msgs = msgs.map(s => clc.red(s))
      else if (methodName === 'warn') msgs = msgs.map(s => clc.yellow(s))*/
      console[methodName](...msgs)
    }
  }

  return reporter
}

export { initReporter }
