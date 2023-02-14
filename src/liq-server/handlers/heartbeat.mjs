const method = 'get'
const path = ['']

const func = () => (req, res) => {
  res.json(true)
  // res.json(app.liq.handlers)
}

export { func, method, path }
