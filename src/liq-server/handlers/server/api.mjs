const method = 'get'
const path = ['server', 'api']

const func = ({ app }) => (req, res) => {
  res.json(app.liq.handlers)
}

export { func, method, path }
