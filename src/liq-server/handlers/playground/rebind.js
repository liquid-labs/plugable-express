const verb = 'rebind'
const path = `/playground`

const func = (liqModel) => (req, res) => {
  liqModel.refreshPlayground()
  res.json(true)
}

export { func, path, verb }
