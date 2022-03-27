const shell = require('shelljs')

const { Worker, parentPort, workerData } = require('worker_threads')

const { dryRun, localProjectPath, projectName } = workerData

const execOptions = { silent: true, shell: '/bin/bash' }
// no 'set -e' because 'outdated' exits '1' if there's anything to update.
const outdatedResult = shell.exec(`
  cd "${localProjectPath}"
  npm --json outdated`,
  execOptions
)
if (outdatedResult.stderr) { // notice we can't check 'code'; this is arguable an npm bug...
  throw new Error(`There was an error gathering update data: ${outdatedResult.stdout}`)
}

let outdatedData
try {
  outdatedData = JSON.parse(outdatedResult.stdout)
}
catch (err) {
  throw new Error(`Could not parse update data '${outdatedResult.stdout}': ${err}`)
}

if (!outdatedData || Object.keys(outdatedData).length === 0) {
  parentPort.postMessage({ message: `No updates found for '${projectName}'; nothing to do.` })
  return
}

const actions = []
let updateCommand = `npm i ${dryRun ? '--dry-run ' : ''}`
for (const pkgName in outdatedData) {
  const { current, wanted, latest } = outdatedData[pkgName]
  updateCommand += ` ${pkgName}@${wanted}`
  actions.push(`${dryRun ? 'DRY RUN: ' : ''}Updated ${pkgName}@${current} to ${wanted}${wanted === latest ? ' (latest)' : ''}`)
}

const updateResult = shell.exec(`set -e
  cd "${localProjectPath}"
  ${updateCommand}`
)
if (updateResult.code !== 0) {
  throw new Error(`There was an error updating ${projectName} using '${updateCommand}': ${updateResult.stderr}`)
}

parentPort.postMessage({ actions })
