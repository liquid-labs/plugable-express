const method = 'rebind'
const path = ['playground', 'refresh']
const parameters = []

const func = ({ model }) => (req, res) => {
  model.refreshPlayground()
  res.json(true)
}

export { func, path, method, parameters }
