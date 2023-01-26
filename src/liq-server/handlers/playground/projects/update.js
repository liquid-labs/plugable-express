import * as fs from 'fs'
import * as sysPath from 'path'

const method = 'patch'

const path = ['playground', 'projects', ':orgKey', ':localProjectName', 'update']

const parameters = [
  {
    name        : 'dryRun',
    required    : false,
    isBoolean   : true,
    description : 'Reports what would be done if target was updated, but makes no actual changes.'
  }
]

const func = ({ app, model }) => (req, res) => {
  const { dryRun, orgKey, localProjectName } = req.vars

  const localProjectPath = sysPath.join(process.env.HOME, '.liq', 'playground', orgKey, localProjectName)
  if (!fs.existsSync(localProjectPath)) {
    res.status(404).json({ message : `Did not find expected local checkout for project '${orgKey}/${localProjectName}'.` })
    return
  }

  model.tasks.create({
    runFile    : sysPath.join(__dirname, 'workers', 'projects-update.worker.js'),
    workerData : {
      dryRun,
      localProjectPath,
      localProjectName : `${orgKey}/${localProjectName}`
    },
    queueMessage : 'Update task has been queued and should be processed shortly.',
    app,
    req,
    res
  })
}

export { func, parameters, path, method }
