import { Organization } from '@liquid-labs/orgs-model'

const loadOrg = ({ playground, projectModel, reporter }) => {
  reporter.log(`Found org definition project: ${projectModel.fullName}`)

  // At some point, we'll probably support loading staff-less orgs.
  const staffProjectName = projectModel.packageJSON?.liq?.org?.staffProject
  if (staffProjectName === undefined) {
    reporter.error(`Staff data project not defnied in '${projectModel.fullName}' package definition; add '.liq.org.staffProject'.`)
    return
  }
  const staffDataProject = playground.projects[staffProjectName]
  if (staffDataProject === undefined) {
    reporter.error('Could not locate staff data project in local playground, skipping org loading.')
    return
  }

  const staffJSONPath = `${staffDataProject.localProjectPath}/staff.json`
  return new Organization(`${projectModel.localProjectPath}/data`, staffJSONPath)
}

const loadOrgs = ({ playground, reporter = console }) => {
  reporter.log('Loading organization data...')
  const orgs = {}

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
      const orgProject = orgProjects[0]
      const org = loadOrg({ playground, projectModel : orgProject, reporter })
      if (org !== undefined) {
        orgs[orgProject.orgName] = org
      }
    }
  }

  return orgs
}

export { loadOrgs }
