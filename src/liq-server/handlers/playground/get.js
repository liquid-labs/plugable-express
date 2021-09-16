const verb = 'get'
const path = `/playground`

const func = (liqModel) => (req, res) => {
  res.json(liqModel.playground)
}

export { func, path, verb }
