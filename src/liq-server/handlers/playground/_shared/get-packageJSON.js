const getPackageJSON = ({ req, res, model }) => {
  const { orgKey, projectName } = req.params
    
  return res.json(model.playground.orgs[orgKey].projects[projectName].packageJSON)
}

export { getPackageJSON }
