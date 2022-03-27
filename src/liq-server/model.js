import { loadPlayground, loadOrgs } from './lib'
import { Worker } from 'worker_threads'

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
*  orgsAlphaList: [ <alhpa sorted list of modeled org names> ],
*  workers: {}
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
    
    model.tasks = {
      create: ({ runFile, workerData, onError, onOnline, onMessage, onMessageError, onExit }) => {
        const worker = new Worker(runFile, { workerData })
        const { threadId } = worker
        worker.acknowledge = () => {
          const data = model.tasks.data[threadId]
          if (data) {
            data.acknowledged = true
          }
        }
        worker.unref()
        
        model.tasks.data[threadId] = {
          startTime: new Date().getTime(),
          endTime: null,
          status: 'offline',
          results: undefined,
          error: undefined,
          exitCode: undefined,
          acknowledged: false
        }

        worker.on('online', () => {
          const data = model.tasks.data[threadId]
          if (data) {
            data.status = 'online'
          }
          if (onOnline) {
            onOnline(worker)
          }
        })
        worker.on('error', (err) => {
          const data = model.tasks.data[threadId]
          if (data) {
            data.status = 'error'
            data.error = err
          }
          if (onError) {
            onError(worker)
          }
        })
        worker.on('messageerror', (err) => {
          const data = model.tasks.data[threadId]
          if (data) {
            data.status = 'messageerror'
            data.error = err
          }
          if (onMessageError) {
            onMessageError(worker)
          }
        })
        worker.on('message', (result) => {
          const data = model.tasks.data[threadId]
          if (data) {
            data.status = 'resolved'
            data.results = result
          }
          if (onMessage) {
            onMessage(worker)
          }
        })
        worker.on('exit', (code) => {
          const data = model.tasks.data[threadId]
          if (data) {
            data.status = 'done'
            data.exitCode = code
            data.endTime = new Date().getTime()
          }
          if (onExit) {
            onExit(worker)
          }
        })
        
        return worker
      }, // end 'create'
      remove: (threadId) => {
        delete model.tasks.data[threadId]
      },
      data: {}
    }
    
    // clean out completed, acknowledged tasks and too old tasks
    const staleTaskTimeout = 25 * 60 * 60 * 1000 // a little over a day
    setInterval(() => {
      for (const threadId of Object.keys(model.tasks.data)) {
        const data = model.tasks.data[threadId]
        if ((data[threadId]?.acknowledged === true && data[threadId]?.status === 'done')
            || new Date().getTime() - data[threadId]?.startTime > staleTaskTimeout ) {
          model.tasks.remove(threadId)
          // TODO: kill the worker
        }
      }
    }, 60000).unref()

    return model
  }
}

export { model }
