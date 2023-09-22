import { commonOutputParams, formatOutput } from '@liquid-labs/liq-handlers-lib'

const help = {
  name        : 'Registries list',
  summary     : 'Lists the configured registries.',
  description : 'Lists the configured registries.'
}
const method = 'get'
const path = ['server', 'plugins', 'registries', 'list']

const parameters = commonOutputParams() // option func setup on 'fields' below

const defaultFields = ['url']
const allFields = [...defaultFields]
parameters.find((o) => o.name === 'fields').optionsFunc = () => allFields

const mdFormatter = ({ data, title }) => `# ${title}\n\n`
  + data.map((p) => `- ${p.name ? `**${p.name}**: ` : ''}${p.url}`).join('\n') + '\n'

const terminalFormatter = ({ data }) =>
  data.map((p) => `- ${p.name ? `<em>${p.name}<rst>: ` : ''}${p.url}`).join('\n') + '\n'

const textFormatter = ({ data }) =>
  data.map((p) => `- ${p.name ? p.name + ': ' : ''}${p.url}`).join('\n') + '\n'

const func = ({ app, reporter }) => (req, res) => {
  const data = app.ext.serverSettings.registries

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
