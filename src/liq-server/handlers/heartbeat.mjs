const method = 'get'
const path = ['']
const parameters = []

const func = ({ reporter }) => (req, res) => {
  reporter.isolate()
  reporter.push('heartbeat request')
  res.json(true)
  // res.json(app.liq.handlers)
}

export { func, method, parameters, path }
