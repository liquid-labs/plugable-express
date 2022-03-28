const { parentPort, workerData } = require('worker_threads')

const { updateDeps } = require('@liquid-labs/liq-handlers-lib')

const { updated } = updateDeps({
  parentPort,
  workerData
})
