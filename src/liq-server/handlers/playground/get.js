const verb = 'get'
const path = `/playground`

const func = ({ model }) => (req, res) => {
  res.json(model.playground)
}

export { func, path, verb }
