const getOrgFromKey = ({ model, orgKey, params }) => {
  orgKey = orgKey || params.orgKey
  const org = model.orgs[orgKey]
  
  if (!org) {
    res.status(400).json({ message: `Could not locate org '${orgKey}'.` })
    return false
  }
  
  return org
}

export { getOrgFromKey }
