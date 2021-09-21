import http from 'http'

const verb = 'get'
const path = '/listMethods'

const func = () => (req, res) => {
  res.json(http.METHODS)
}

export { func, path, verb }
