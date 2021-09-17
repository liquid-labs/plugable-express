const getPackageJSON = ({ req, res, model }) => {
  const { orgName, projectName } = req.params
    
  return res.json(model.playground.orgs[orgName].projects[projectName].packageJSON)
}

export { getPackageJSON }
