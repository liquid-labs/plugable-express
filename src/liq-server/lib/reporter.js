const outputMethodNames = [
  'debug',
  'error',
  'info',
  'log',
  'table',
  'warn'
]

const reporter = Object.assign(
  {
    configure : ({ SILENT }) => {
      reporter.configuration.silent = SILENT
    },
    configuration : { silent: false }
  },
  console
)

for (const methodName of outputMethodNames) {
  reporter[methodName] = (...msgs) => {
    if (!reporter.configuration.silent) {
      console[methodName](...msgs)
    }
  }
}

export { reporter }
