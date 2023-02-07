// import clc from 'chalk'

const outputMethodNames = [
  'debug',
  'error',
  'info',
  'log',
  'table',
  'warn'
]

const Reporter = class {
  #configuration
  #taskReport

  constructor({ _taskReport, ...configOptions } = {}) {
    this.#configuration = { silent : false }
    this.configure(configOptions)

    this.#taskReport = [...(_taskReport || [])]

    for (const methodName of outputMethodNames) {
      this[methodName] = (...msgs) => {
        if (this.#configuration.silent) return
        // else, not silent
        // TODO: color error and warning? Add 'noColor' option
        console[methodName](...msgs)
      }
    }
  }

  configure(options = {}) {
    this.#configuration = Object.assign(this.#configuration, options)
  }

  isolate() {
    return new Reporter(Object.assign(this.#configuration, { _taskReport : this.#taskReport }))
  }

  push(msg, { noLog = false } = {}) {
    this.#taskReport.push(msg)
    if (noLog !== true) this.log(msg)
  }

  get taskReport() { return [...this.#taskReport] }

  reset() { this.#taskReport = [] }
}

export { Reporter }
