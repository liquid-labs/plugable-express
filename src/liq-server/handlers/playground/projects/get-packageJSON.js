const verb = 'get'
const preName = '/playground/projects/'
const postName = '/packageJSON'
const path = `${preName}*${postName}`

const func = (liqModel) => (req, res) => {
  const path = req.path
  const nameLength = path.length - preName.length - postName.length
  const name = path.substr(preName.length, nameLength)
  
  res.json(liqModel.playground.projects[name].packageJSON)
}

export { func, path, verb }
