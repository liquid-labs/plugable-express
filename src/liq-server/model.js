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
*     orgsAlphaList: [ alpha sorted list of org names ]
*   }
* }
* ```
*/
const model = {
  /**
  * Initializes the model by loading the playground.
  */
  initialize : (options) => {
    model.playground = loadPlayground(options)
    const orgsOptions = Object.assign({ playground: model.playground }, options)
    model.orgs = loadOrgs(orgsOptions)

    // bind the original options to refreshPlayground
    model.refreshPlayground = () => {
      model.playground = loadPlayground(options)
      
      return model.playground
    }

    return model
  }
}

export { model }
