import { commonOutputParams, formatOutput } from '@liquid-labs/liq-handlers-lib'

const method = 'get'
const path = ['tasks', 'list']

const parameters = commonOutputParams() // option func setup on 'fields' below

const allFields = ['threadId', 'startTime', 'endTime', 'running', 'status', 'actions', 'error', 'exitCode', 'acknowledged']
const defaultFields = ['threadId', 'startTime', 'endTime', 'status', 'error', 'exitCode']

parameters.find((o) => o.name === 'fields').optionsFunc = () => allFields

const mdFormatter = ({ data = [], title }) => `# ${title}\n\n${data.map((t) => `* __${t.threadId}__ is: ${t.status}`).join('\n')}\n`

const terminalFormatter = ({ data = [] }) => data.map((t) => `<h1>${t.threadId}<rst> is: <em>${t.status}<rst> `).join('\n')

const textFormatter = ({ data = [] }) => data.map((t) => `${t.threadId} is: ${t.status} `).join('\n')

const func = ({ app, reporter }) => (req, res) => {
  const tasks = app.tasks.list()

  formatOutput({
    basicTitle : 'Tasks',
    data       : tasks,
    allFields,
    defaultFields,
    mdFormatter,
    terminalFormatter,
    textFormatter,
    reporter,
    req,
    res,
    ...req.vars
  })
}

export { func, parameters, path, method }
