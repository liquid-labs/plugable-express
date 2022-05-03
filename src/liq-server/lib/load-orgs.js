import * as path from 'path'

import { Organization } from '@liquid-labs/orgs-model'

const loadOrgs = ({ playground, reporter = console }) => {
  reporter.log('Loading organization data...')
  const orgs = {}

  for (const orgName of playground.orgsAlphaList) {
    const orgTypeRe = /(^(.*|)?org(|.*)?$)/
    const orgProjects = Object.values(playground.orgs[orgName].projects)
      .filter((projectModel) => {
        // console.log(`testing: ${projectModel.packageJSON?.liq?.packageType}`)
        // console.log(projectModel)
        return projectModel.packageJSON?.liq?.packageType?.match(orgTypeRe)
      })

    if (!orgProjects || orgProjects.length === 0) {
      reporter.log(`Skipping '${orgName}'; no org definition found.`)
    }
    else if (orgProjects.length > 1) {
      reporter.error(`Skipping org '${orgName}' due to multiple, ambiguous definitions: ${orgProjects}`)
    }
    else {
      const orgProject = orgProjects[0]
      const { fullName, localProjectPath, orgName } = orgProject

      const dataPath = path.join(localProjectPath, 'data')
      reporter.log(`Found org definition project: ${fullName}\n  using data path ${dataPath}`)

      try {
        const org = new Organization({ dataPath })
        if (org !== undefined) {
          orgs[orgProject.orgName] = org
        }
        else {
          reporter.warn(`Loading '${orgName}' resulted in 'undefined'.`)
        }
      }
      catch (e) {
        reporter.warn(`Failed to load '${orgName}'; ${e.message}`)
        console.warn(e.stack)
      }
    }
  }

  if (Object.keys(orgs).length === 0) {
    const msg = 'No valid organizations were loaded; bailing out.'
    reporter.error(msg)
    throw new Error(msg)
  }

  return orgs
}

export { loadOrgs }
