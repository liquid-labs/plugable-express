import * as fs from 'node:fs'

import { LIQ_PLAYGROUND } from '@liquid-labs/liq-defaults'

import { Model } from '@liquid-labs/resource-model'

import { filterLiqDirs } from './lib/filter-liq-dirs'
import { PlaygroundProjects } from './lib/PlaygroundProjects'

/**
* The model looks like:
* ```
* {
*   playground: {
*     projects: {
*       <project full name>: {
*         fullName         : <string>,
*         name             : <string>,
*         orgName          : <string>,
*         localProjectPath : <string>,
*         packageJSON      : <local package.json contents>
*       },
*       ...
*     },
*     projectsAlphaList: [ alpha sorted list of full project names ] // currently case sensitive, TODO: fix that
*     projectsByDir: { [ base project directory ]: <project entry (as from 'projects')>},
*     orgs: {
*       <liq org name>: {
*         projects: { <project base name>: <refs to projects data>... },
*         projectsAlphaList: [ alpha sorted list of project base names ] // TODO: same as above
*     },
*     orgsAlphaList: [ alpha sorted list of org names with at least one project ]
*   },
*  orgs: { <org name>: <org definition> },
*  orgsAlphaList: [ <alhpa sorted list of modeled org names> ],
*  workers: {}
* }
* ```
*/
const initModel = ({ reporter = console } = {}) => {
  const model = new Model()

  const playground = new Model()

  playground.orgDirs = () => {
    return filterLiqDirs({
      files    : fs.readdirSync(LIQ_PLAYGROUND(), { withFileTypes : true }),
      basePath : LIQ_PLAYGROUND(),
      reporter
    })
  }

  playground.projectDirs = ({ orgPath }) => {
    return filterLiqDirs({
      files : fs.readdirSync(orgPath, { withFileTypes : true }),
      basePath: orgPath
    })
  }

  model.bindSubModel('playground', playground) // model.playground
  playground.bindRootItemManager(new PlaygroundProjects({ reporter })) // model.playground.projects

  return model
}

export { initModel }
