const TaskManager = class {
  #data = {}

  constructor() {
    // clean out completed, acknowledged tasks and too old tasks
    const staleTaskTimeout = 25 * 60 * 60 * 1000 // a little over a day
    setInterval(() => {
      for (const threadId of Object.keys(this.#data)) {
        const data = this.#data[threadId]
        if ((data[threadId]?.acknowledged === true && data[threadId]?.running === false)
            || new Date().getTime() - data[threadId]?.startTime > staleTaskTimeout) {
          this.remove(threadId)
          // TODO: kill the worker
        }
      }
    }, 60000).unref()
  }

  create({
    // required
    runFile,
    workerData,
    res,
    req,
    app,
    // optional
    queueMessage = 'Task queued.', // highly reccomended
    onError,
    onOnline,
    onMessage,
    onMessageError,
    onExit
  }) {
    const worker = new Worker(runFile, { workerData })
    const { threadId } = worker
    worker.acknowledge = () => {
      const data = this.#data[threadId]
      if (data) {
        data.acknowledged = true
      }
    }
    worker.unref()

    this.#data[threadId] = {
      startTime    : new Date().getTime(),
      endTime      : null,
      running      : false,
      status       : 'not started',
      actions      : [],
      error        : undefined,
      exitCode     : undefined,
      acknowledged : false
    }

    worker.on('online', () => {
      const data = this.#data[threadId]
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
      const data = this.#data[threadId]
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
      const data = this.#data[threadId]
      if (data) {
        data.status = 'messageerror'
        data.error = err.toString()
      }
      if (onMessageError) {
        onMessageError(worker)
      }
    })
    worker.on('message', (msgs) => {
      const data = this.#data[threadId]
      if (data) {
        data.actions.push(...msgs)
      }
      if (onMessage) {
        onMessage(worker)
      }
    })
    worker.on('exit', (code) => {
      const data = this.#data[threadId]
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
      message  : queueMessage,
      followup : [
        `${req.protocol}://${req.hostname || req.ip}:${app.serverData.port}/tasks/${worker.threadId}`,
        `liq tasks ${worker.threadId}`
      ]
    })

    return worker
  } // end 'create'
  
  get(threadId) {
    return structuredClone(this.#data[threadId])
  }

  remove(threadId) {
    delete this.#data[threadId]
  }
}

export { TaskManager }