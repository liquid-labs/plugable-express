const verb = 'unbind'
const path = /\/(quit)?/ // '/(quit)?' does not get transalted properly in express 4.17.1

const func = () => (req, res) => {
  res.send('Shutting down...')
  process.kill(process.pid, 'SIGTERM')
}

export { func, path, verb }
