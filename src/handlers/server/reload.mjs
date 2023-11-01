const method = 'put'
const path = ['server', 'reload']
const parameters = []

const func = ({ app, cache, reporter }) => async(req, res) => {
  app.reload()

  res.json({ message : 'App reloaded.' })
}

export { func, method, parameters, path }
