const verb = 'unbind'
const path = `/quit`

const func = (liqModel) => (req, res) => {
  res.send('Shutting down...')
  process.kill(process.pid, 'SIGTERM')
}

export { func, path, verb }
