const verb = 'put'
const path = '/orgs/:orgName/staff'

const func = ({ model }) => (req, res) => {
  const results = []
  for (const fileName of Object.keys(req.files)) {
    
    
    results.push(Object.keys(req.files[fileName]))
  }
  results.push(req.param)
  res.json(results)
  /*for (const fileName in req.files.file) {
    res.json(fileName)
  }*/
  /*for (const fileName of files) {
    res.
  }*/
}

export { func, path, verb }
