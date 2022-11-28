const getPackageJSON = ({ req, res, model }) => {
  const { orgKey, projectName } = req.vars
    
  return res.json(model.playground.orgs[orgKey].projects[projectName].packageJSON)
}

export { getPackageJSON }
