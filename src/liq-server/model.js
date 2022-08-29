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
      create: ({
        // required
        runFile,
        workerData,
        res,
        req,
        app,
        // optional
        queueMessage="Task queued.", // highly reccomended
        onError,
        onOnline,
        onMessage,
        onMessageError,
        onExit
      }) => {
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
          running: false,
          status: 'not started',
          actions: [],
          error: undefined,
          exitCode: undefined,
          acknowledged: false
        }

        worker.on('online', () => {
          const data = model.tasks.data[threadId]
          if (data) {
            data.running = true
            data.status = 'started'
          }
          if (onOnline) {
            onOnline(worker)
          }
        })
        worker.on('error', (err) => {
          console.error(err) // TODO: we lose the stack trace in the 'err.toString()', but there are probaby better approaches
          const data = model.tasks.data[threadId]
          if (data) {
            data.status = 'error'
            data.error = err.toString()
          }
          if (onError) {
            onError(worker)
          }
          worker.terminate()
        })
        worker.on('messageerror', (err) => {
          console.error(err) // TODO: we lose the stack trace in the 'err.toString()', but there are probaby better approaches
          const data = model.tasks.data[threadId]
          if (data) {
            data.status = 'messageerror'
            data.error = err.toString()
          }
          if (onMessageError) {
            onMessageError(worker)
          }
        })
        worker.on('message', (msgs) => {
          const data = model.tasks.data[threadId]
          if (data) {
            data.actions.push(...msgs)
          }
          if (onMessage) {
            onMessage(worker)
          }
        })
        worker.on('exit', (code) => {
          const data = model.tasks.data[threadId]
          if (data) {
            if (data.status === 'started') {
              data.status = 'done'
            } // else, it's an error condition so we leave it
            data.running = false
            data.exitCode = code
            data.endTime = new Date().getTime()
          }
          if (onExit) {
            onExit(worker)
          }
        })
        
        res.json({
          message: queueMessage,
          followup: [
            `${req.protocol}://${req.hostname || req.ip}:${app.serverData.port}/tasks/${worker.threadId}`,
            `liq tasks ${worker.threadId}`
          ]
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
        if ((data[threadId]?.acknowledged === true && data[threadId]?.running === false)
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
