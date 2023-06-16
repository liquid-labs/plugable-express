const method = 'get'
const path = ['playground']
const parameters = []

const func = ({ model }) => (req, res) => {
  res.json(model.playground)
}

export { func, path, method, parameters }
