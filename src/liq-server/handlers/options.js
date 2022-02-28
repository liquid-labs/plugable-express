const method = 'options'
const path = '/([*])'

const func = ({ app/*, reporter*/ }) => (req, res) => {
  res.json(app.handlers)
  //res.json(app.handlers)
}

export { func, method, path }
