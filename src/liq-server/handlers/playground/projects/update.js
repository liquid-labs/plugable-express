import * as fs from 'fs'
import * as sysPath from 'path'

import { serverData } from '../../../server'

const method = 'patch'

const path = '(/playground)?/projects/:orgKey/:projectName/update'

const parameters = [
  {
    name: 'dryRun',
    required: false,
    isBoolean: true,
    description: 'Reports what would be done if target was updated, but makes no actual changes.'
  }
]

const func = ({ model }) => (req, res) => {
  const { orgKey, projectName } = req.params
  const { dryRun } = req.query
  
  const localProjectPath = sysPath.join(process.env.HOME, '.liq', 'playground', orgKey, projectName)
  if (!fs.existsSync(localProjectPath)) {
    res.status(404).json({ message: `Did not find expected local checkout for project '${orgKey}/${projectName}'.`})
    return
  }
  
  const worker = model.tasks.create({
    runFile: sysPath.join(__dirname, 'workers', 'projects-update.worker.js'),
    workerData: {
      dryRun,
      localProjectPath,
      projectName: `${orgKey}/${projectName}` },
  })
  
  res.json({
    message: "Update task has been queued and should be processed shortly.",
    followup: [
      `${req.protocol}://${req.hostname || req.ip}:${serverData.port}/tasks/${worker.threadId}`,
      `liq tasks ${worker.threadId}`
    ]
  })
}

export { func, parameters, path, method }
