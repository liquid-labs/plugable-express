const command = 'GET'
const preOrg = '/playground/orgs/'
const preProject = '/projects/'
const postProject = '/packageJSON'
const path = `${preOrg}*${preProject}*${postProject}`

const func = (innerState) => (req, res) => {
  const path = req.path
  const midBitLength = path.length - preOrg.length - postProject.length
  const midBit = path.substr(preOrg.length, midBitLength)
  const orgName = midBit.replace(/\/.+$/, '')
  const projectName = midBit.replace(/^.+\//, '')
  
  res.json(innerState.playground.orgs[orgName].projects[projectName].packageJSON)
}

export { func, path, command }
