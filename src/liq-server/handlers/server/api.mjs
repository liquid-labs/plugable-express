const method = 'get'
const path = ['server', 'api']
const parameters = []

const func = ({ app }) => (req, res) => {
  res.json(app.ext.handlers)
}

export { func, method, parameters, path }
