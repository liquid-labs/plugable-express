const help = {
  name    : 'server heartbeat',
  summary : 'Endpoint to check that the server is up and listening.'
}

const method = 'get'
const path = ['heartbeat']
const parameters = []

const func = ({ reporter }) => (req, res) => {
  reporter.isolate()
  reporter.push('heartbeat request')
  res.json(true)
  // res.json(app.ext.handlers)
}

export { func, help, method, parameters, path }
