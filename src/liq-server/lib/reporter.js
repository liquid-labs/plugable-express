const reporter = {
  configure: ({ SILENT }) => {
    reporter.silent = SILENT
  },
  error: (...args) => console.log(...args),
  log: (...args) => {
    if (!reporter.silent) {
      console.log(...args)
    }
  },
  silent: false,
}

export { reporter }
