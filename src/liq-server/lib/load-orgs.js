const loadOrg = ({ projectModel, reporter }) => {
  reporter.log(`Found org definition project: ${projectModel.fullName}`)
  reporter.log(projectModel.localProjectPath)
}

const loadOrgs = ({ playground, reporter = console }) => {
  reporter.log('Loading organization data...')
  
  for (const orgName of playground.orgsAlphaList) {
    const orgTypeRe = /(^|[|])org([|]|$)/
    const orgProjects = Object.values(playground.orgs[orgName].projects)
      .filter((projectModel) => projectModel.packageJSON?.liq?.packageType?.match(orgTypeRe))
    
    if (!orgProjects || orgProjects.length === 0) {
      reporter.log(`Skipping '${orgName}'; no org definition found.`)
    }
    else if (orgProjects.length > 1) {
      reporter.error(`Skipping org '${orgName}' due to multiple, ambiguous definitions: ${orgProjects}`)
    }
    else {
      loadOrg({ projectModel: orgProjects[0], reporter })
    }
  }
}

export { loadOrgs }
