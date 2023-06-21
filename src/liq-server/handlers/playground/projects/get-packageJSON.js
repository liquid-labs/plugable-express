const method = 'get'
const path = ['playground', 'projects', ':orgKey', ':localProjectName', 'packageJSON']
const parameters = []

const func = ({ model }) => (req, res) => {
  const { orgKey, localProjectName } = req.vars

  return res.json(model.playground.projects.get(orgKey + '/' + localProjectName).packageJSON)
}

export { func, path, method, parameters }
