const help = {
  name        : 'server API',
  summary     : 'Creates a representation of the current API.',
  description : 'Creates a representation of the current API based on the core endpoints and currently loaded plugins. The resulting data structure is an array of "handler" entries. Each entry contains the `npmName` of the source package, the `path` (as array of path components), the `routeablePath` actually used to match paths for service, the endpoint HTTP `method`, and `parameters` data.'
}

const method = 'get'
const path = ['server', 'api']
const parameters = []

const func = ({ app }) => (req, res) => {
  res.json(app.ext.handlers)
}

export { func, help, method, parameters, path }
