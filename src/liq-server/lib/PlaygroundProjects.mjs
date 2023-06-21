import * as fs from 'node:fs'
import * as fsPath from 'node:path'

import { idxType, ItemManager } from '@liquid-labs/resource-model'

import { filterLiqDirs } from './filter-liq-dirs'
import { LIQ_PLAYGROUND } from '../../shared/locations'
import { PlaygroundProject } from './PlaygroundProject'
import { readPackageJSON } from './json-helpers'

const PlaygroundProjects = class extends ItemManager {
  constructor({ reporter = console } = {}) {
    super({
      reporter,
      indexes : [
        { name : 'localProjectPath', indexField : 'localProjectPath', relationship : idxType.ONE_TO_ONE },
        { name : 'npmName', indexField : 'npmName', relationship : idxType.ONE_TO_ONE }
      ]
    })
  }

  load({ reporter } = {}) {
    reporter?.log(`Loading playground projects from: ${LIQ_PLAYGROUND()}`)
    this.truncate()

    // console.error('LIQ_PLAYGROUND:', LIQ_PLAYGROUND()) // DEBUG
    const orgDirs = filterLiqDirs({
      files    : fs.readdirSync(LIQ_PLAYGROUND(), { withFileTypes : true }),
      basePath : LIQ_PLAYGROUND(),
      reporter
    })

    for (const orgDir of orgDirs) {
      const orgName = orgDir.name
      reporter?.log(`Processing org: ${orgName}...`)
      const basePath = fsPath.join(LIQ_PLAYGROUND(), orgName)
      const projectDirs = filterLiqDirs({
        files : fs.readdirSync(basePath, { withFileTypes : true }),
        basePath
      })

      reporter?.log(`Loading ${projectDirs.length} projects...`)
      for (const projectDir of projectDirs) {
        const projectName = projectDir.name
        const localProjectPath = fsPath.join(basePath, projectName)
        try {
          // console.error('localProjectPath:', localProjectPath) // DEBUG
          const packageJSON = readPackageJSON(localProjectPath)
          // console.error('packageJSON:', packageJSON) // DEBUG
          const npmName = packageJSON?.name

          this.add({ 
            name : `${orgName}/${projectName}`, 
            localProjectPath, 
            npmName, 
            orgName, 
            baseName: projectName, packageJSON, 
            projectName 
          })
        }
        catch (e) {
          console.log(e)
          if (e instanceof SyntaxError) {
            reporter?.warn(`\nWARNING: skipping project '${projectName}'; it is likely the 'package.json' file is malformed.`)
          }
          else {
            throw e
          }
        }
      }
    }
  }

  save() { throw new Error('Cannot save playground projects; projects must be updated individiually.') }
}

Object.defineProperty(PlaygroundProjects, 'itemConfig', {
  value        : PlaygroundProject.itemConfig,
  writable     : false,
  enumerable   : true,
  configurable : false
})

export { PlaygroundProjects }
