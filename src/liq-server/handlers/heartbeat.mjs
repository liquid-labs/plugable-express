const method = 'get'
const path = ['']

const func = ({ reporter }) => (req, res) => {
  reporter.isolate()
  reporter.push('heartbeat request')
  res.json(true)
  // res.json(app.liq.handlers)
}

export { func, method, path }
