const verb = 'rebind'
const path = `/playground`

const func = () => (req, res) => {
  model.refreshPlayground()
  res.json(true)
}

export { func, path, verb }
