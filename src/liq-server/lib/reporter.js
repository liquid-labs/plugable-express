const reporter = {
  configure: ({ SILENT }) => {
    reporter.silent = SILENT
  },
  log: (...args) => {
    if (!reporter.silent) {
      console.log(...args)
    }
  },
  silent: false,
}

export { reporter }
