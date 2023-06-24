import * as fs from 'node:fs'
import * as fsPath from 'node:path'

import { LIQ_PLAYGROUND } from '@liquid-labs/liq-defaults'
import { Organization } from '@liquid-labs/orgs-model'
import { Model } from '@liquid-labs/resource-model'

import { filterLiqDirs } from './filter-liq-dirs'
import { readPackageJSON } from './json-helpers'

const orgTypeRe = /(^(.*|)?org(|.*)?$)/

const Organizations = class extends Model {
  #playground

  constructor({ playground, reporter = console }) {
    super({ items : [] })

    this.#playground = playground
    this.load({ reporter })
  }

  load({ reporter = console } = {}) {
    reporter.log('Loading organization data...')

    const orgDirs = filterLiqDirs({
      files    : fs.readdirSync(LIQ_PLAYGROUND(), { withFileTypes : true }),
      basePath : LIQ_PLAYGROUND(),
      reporter
    })

    for (const orgDir of orgDirs) {
      const orgName = orgDir.name
      const basePath = fsPath.join(LIQ_PLAYGROUND(), orgName)

      const orgProjectDirs = filterLiqDirs({
        files : fs.readdirSync(basePath, { withFileTypes : true }),
        basePath
      })

      reporter.log(`Searching ${orgProjectDirs.length} org projects for org definition...`)
      const orgProjects = []
      for (const orgProjectDir of orgProjectDirs) {
        const projectName = orgProjectDir.name
        const localProjectPath = fsPath.join(basePath, projectName)
        try {
          const packageJSON = readPackageJSON(localProjectPath)

          if (packageJSON?.liq?.packageType?.match(orgTypeRe)) {
            orgProjects.push({
              fullName : `${orgName}/${projectName}`,
              orgName,
              localProjectPath,
              packageJSON
            })
          }
        }
        catch (e) {
          console.log(e)
          if (e instanceof SyntaxError) {
            reporter.warn(`\nWARNING: skipping project '${projectName}'; it is likely the 'package.json' file is malformed.`)
          }
          else {
            throw e
          }
        }
      }

      if (!orgProjects || orgProjects.length === 0) {
        reporter.log(`Skipping '${orgName}'; no org definition found.`)
      }
      else if (orgProjects.length > 1) {
        reporter.error(`Skipping org '${orgName}' due to multiple, ambiguous definitions: ${orgProjects}`)
      }
      else {
        const orgProject = orgProjects[0]
        const { fullName, localProjectPath, orgName } = orgProject

        const dataPath = fsPath.join(localProjectPath, 'data')
        reporter.log(`Found org definition project: ${fullName}\n  using data path ${dataPath}`)

        try {
          const org = new Organization({ dataPath })
          this.bindSubModel(org.id, org)
        }
        catch (e) {
          reporter.warn(`Failed to load '${orgName}'; ${e.message}`)
          console.warn(e.stack)
        }
      }
    }

    if (Object.keys(this).length === 0) {
      const msg = 'No valid organizations were loaded; bailing out.'
      reporter.error(msg)
      throw new Error(msg)
    }
  }

  save() { throw new Error('Cannot save organizations; organizations must be saved individiually.') }
}

export { Organizations }
