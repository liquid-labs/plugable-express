const command = 'GET'
const preName = '/playground/projects/'
const postName = '/packageJSON'
const path = `${preName}*${postName}`

const func = (innerState) => (req, res) => {
  const path = req.path
  const nameLength = path.length - preName.length - postName.length
  const name = path.substr(preName.length, nameLength)
  
  res.json(innerState.playground.projects[name].packageJSON)
}

export { func, path, command }
