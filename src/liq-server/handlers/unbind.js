const method = 'unbind'
const path = '/(quit)?'

const func = () => (req, res) => {
  res.send('Shutting down...')
  process.kill(process.pid, 'SIGTERM')
}

export { func, path, method }
