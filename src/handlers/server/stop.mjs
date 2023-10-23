const method = 'unbind'
const path = ['server', 'stop?']
const parameters = []

const func = ({ app, cache }) => async(req, res) => {
  res.send('Shutting down...')

  for (teardownMethod of app.ext.teardownMethods) {
    const ret = teardownMethod({ app })
    if (ret.then) {
      await ret
    }
  }

  cache.release()
  process.kill(process.pid, 'SIGTERM')
}

export { func, path, method, parameters }
