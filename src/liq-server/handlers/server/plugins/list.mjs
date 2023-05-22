import { commonOutputParams, formatOutput } from '@liquid-labs/liq-handlers-lib'

const help = {
  name        : 'Plugins list',
  summary     : 'Lists the installed server plugins.',
  description : 'Lists the installed server plugins.'
}
const method = 'get'
const path = ['server', 'plugins', 'list']

const parameters = commonOutputParams() // option func setup on 'fields' below

const defaultFields = ['name', 'summary', 'handlerCount']
const allFields = [...defaultFields]
parameters.find((o) => o.name === 'fields').optionsFunc = () => allFields

const mdFormatter = ({ data, title }) => `# ${title}\n\n`
  + data.map((p) => `- **${p.name}** (${p.handlerCount} handlers): ${p.summary}`).join('\n') + '\n'

const terminalFormatter = ({ data }) =>
  data.map((p) => `- <em>${p.name}<rst> (${p.handlerCount} handlers): ${p.summary}`).join('\n') + '\n'

const textFormatter = ({ data }) =>
  data.map((p) => `- ${p.name} (${p.handlerCount} handlers): ${p.summary}`).join('\n') + '\n'

const func = ({ app, reporter }) => (req, res) => {
  const data = app.liq.plugins
    .map((p) => ({ name : p.name, summary : p.summary, handlerCount : p.handlersInfo.length }))
    .sort((a, b) =>
      a.name.localeCompare(b.name) // 1 and -1 are true-ish, only zero then fallsback to the secondary sort
        || (a.handlerCount > b.handlerCount ? -1 : (a.handlerCount < b.handlerCount ? 1 : 0)))

  formatOutput({
    basicTitle : 'Plugins Report',
    data,
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

export { func, help, method, parameters, path }
