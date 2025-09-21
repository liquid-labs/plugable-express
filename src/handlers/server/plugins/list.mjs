import { commonOutputParams, formatOutput } from '@liquid-labs/liq-handlers-lib'

import { listPlugins } from './_lib/list-plugins'

const allFields = ['npmName', 'installed', 'summary', 'handlerCount', 'provider', 'homepage', 'version']

const listPluginsSetup = ({ pluginsDesc }) => {
  const help = {
    name        : `${pluginsDesc} plugins list`,
    summary     : `Lists the installed ${pluginsDesc} plugins.`,
    description : `Lists the installed ${pluginsDesc} plugins.`
  }
  const method = 'get'

  const parameters = [
    ...commonOutputParams() // option func setup on 'fields' below
  ]
  parameters.find((o) => o.name === 'fields').optionsFetcher = () => allFields

  return { help, method, parameters }
}

const generateRowText = ({
  codeClose,
  codeOpen,
  homepageClose = '',
  homepageOpen = '',
  installedClose = '',
  installedOpen = '',
  nameClose = '',
  nameOpen = '',
  p,
  providerClose = '',
  providerOpen = ''
}) => {
  let row = `- ${nameOpen}${p.npmName}${nameClose}`
  if (p.provider !== undefined) {
    row += ` from ${providerOpen}${p.provider}${providerClose}`
  }
  if (p.installed !== undefined || p.handlerCount !== undefined) {
    row += ` (${p.installed !== undefined ? `${installedOpen}installed${installedClose}` + (p.handlerCount !== undefined ? '; ' : '') : ''}${p.handlerCount !== undefined ? `${p.handlerCount} handlers` : ''})`
  }
  if (p.summary !== undefined && p.summary.length > 0) {
    row += ': ' + p.summary
  }
  if (p.homepage !== undefined) {
    row += `\n  homepage: ${homepageOpen}${p.homepage}${homepageClose}`
  }

  return row
}

const mdFormatter = ({ data = [], title }) => `# ${title}\n\n`
  + data.map((p) => generateRowText({
    codeClose      : '`',
    codeOpen       : '`',
    homepageClose  : '_',
    homepageOpen   : '_',
    installedClose : '__',
    installedOpen  : '__',
    nameClose      : '___',
    nameOpen       : '___',
    p,
    providerClose  : '__',
    providerOpen   : '__'
  })).join('\n')
  // `- **${p.name}** (${ p.installed !== undefined ? 'installed' + (p.handlerCount !== undefined ? '; ' : '') : ''} ${p.handlerCount} handlers): ${p.summary}`).join('\n') + '\n'

const terminalFormatter = ({ data = [] }) => {
  return data.map((p) => generateRowText({
    codeClose      : '<rst>',
    codeOpen       : '<code>',
    homepageClose  : '<rst>',
    homepageOpen   : '<code>',
    installedClose : '<rst>',
    installedOpen  : '<em>',
    nameClose      : '<rst>',
    nameOpen       : '<h2>',
    p,
    providerClose  : '<rst>',
    providerOpen   : '<bold>'
  })).join('\n')
}
// `- <em>${p.name}<rst> (${p.handlerCount} handlers): ${p.summary}`).join('\n') + '\n'

const textFormatter = ({ data = [] }) =>
  data.map((p) => generateRowText({ p })).join('\n')
// `- ${p.name} (${p.handlerCount} handlers): ${p.summary}`).join('\n') + '\n'

const listPluginsHandler = ({ installedPluginsRetriever }) =>
  ({ app, model, reporter }) => async(req, res) => {
    const installedPlugins = installedPluginsRetriever({ app, model, req }) || []

    const defaultFields = ['npmName', 'handlerCount', 'installed', 'summary', 'homepage']
    const data = installedPlugins
      .map((p) => ({ ...p, installed : true }))
      .sort((a, b) =>
        a.npmName.localeCompare(b.npmName)) // 1 and -1 are true-ish, only zero then fallsback to the secondary sort
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

const { help, method, parameters } = listPluginsSetup({ pluginsDesc : 'server endpoint' })

const path = ['server', 'plugins', 'list']

const installedPluginsRetriever = ({ app }) => listPlugins({ app })

const func = listPluginsHandler({ installedPluginsRetriever })

export { func, help, method, parameters, path }
