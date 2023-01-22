const method = 'rebind'
const path = ['playground', 'refresh']

const func = () => (req, res) => {
  model.refreshPlayground()
  res.json(true)
}

export { func, path, method }
