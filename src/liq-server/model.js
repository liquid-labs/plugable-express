import { loadPlayground, loadOrgs } from './lib'

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
*     orgs: {
*       <liq org name>: {
*         projects: { <project base name>: <refs to projects data>... },
*         projectsAlphaList: [ alpha sorted list of project base names ] // TODO: same as above
*     },
*     orgsAlphaList: [ alpha sorted list of org names with at least one project ]
*   },
*  orgs: { <org name>: <org definition> },
*  orgsAlphaList: [ <alhpa sorted list of modeled org names> ]
* }
* ```
*/
const model = {
  /**
  * Initializes the model by loading the playground.
  */
  initialize : (config) => {
    if (config === undefined) {
      config = model.config
    }
    else if (model.config === undefined) {
      model.config = config
    }
    model.playground = loadPlayground(config)
    
    const orgsOptions = Object.assign({ playground: model.playground }, config)
    model.orgs = loadOrgs(orgsOptions)
    model.orgsAlphaList = model.playground.orgsAlphaList.filter((orgName) => model.orgs[orgName] !== undefined)

    // bind the original config to refreshPlayground TODO: this is notnecessary as we save 'config' on 'model'
    model.refreshPlayground = () => {
      model.playground = loadPlayground(config)
      
      return model.playground
    }

    return model
  }
}

export { model }
