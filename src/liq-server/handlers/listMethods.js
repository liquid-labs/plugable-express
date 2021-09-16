import http from 'http'

const verb = 'get'
const path = `/listMethods`

const func = (liqModel) => (req, res) => {
  res.json(http.METHODS)
}

export { func, path, verb }
