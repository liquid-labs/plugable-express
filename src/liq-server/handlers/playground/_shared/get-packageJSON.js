const getPackageJSON = ({ req, res, model }) => {
  const { orgKey, projectName } = req.params
    
  return res.json(model.playground.orgs[orgName].projects[projectName].packageJSON)
}

export { getPackageJSON }
