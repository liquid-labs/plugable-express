const method = 'unbind'
const path = '/:command((?:q|quit)?)' // '/(quit)?' breaks express 4.17.1 which uses path-to-regexp 0.1.17 (?!)

const func = () => (req, res) => {
  res.send('Shutting down...')
  process.kill(process.pid, 'SIGTERM')
}

export { func, path, method }
