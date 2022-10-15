const method = 'unbind'
const path = new RegExp('/server(?:/stop)?[/#?]?$')

const func = ({ cache }) => (req, res) => {
  res.send('Shutting down...')
  cache.release()
  process.kill(process.pid, 'SIGTERM')
}

export { func, path, method }
