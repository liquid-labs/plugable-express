import * as fs from 'fs'
import * as sysPath from 'path'

const method = 'patch'

const path = ['playground', 'projects', ':localOrgKey', ':localProjectName', 'update']

const parameters = [
  {
    name        : 'dryRun',
    required    : false,
    isBoolean   : true,
    description : 'Reports what would be done if target was updated, but makes no actual changes.'
  }
]

const func = ({ app, model }) => (req, res) => {
  const { dryRun, localOrgKey, localProjectName } = req.vars

  const localProjectPath = sysPath.join(process.env.HOME, '.liq', 'playground', localOrgKey, localProjectName)
  if (!fs.existsSync(localProjectPath)) {
    res.status(404).json({ message : `Did not find expected local checkout for project '${localOrgKey}/${localProjectName}'.` })
    return
  }

  model.tasks.create({
    runFile    : sysPath.join(__dirname, 'workers', 'projects-update.worker.js'),
    workerData : {
      dryRun,
      localProjectPath,
      localProjectName : `${localOrgKey}/${localProjectName}`
    },
    queueMessage : 'Update task has been queued and should be processed shortly.',
    app,
    req,
    res
  })
}

export { func, parameters, path, method }
