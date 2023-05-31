import { commonOutputParams, formatOutput } from '@liquid-labs/liq-handlers-lib'

import { determineRegistryData } from './registries/_lib/determine-registry-data'

const help = {
  name        : 'Plugins list',
  summary     : 'Lists the installed server plugins.',
  description : 'Lists the installed server plugins.'
}
const method = 'get'
const path = ['server', 'plugins', 'list']

const parameters = [
  {
    name: "available",
    isBoolean: true,
    description: "Lists available plugins from registries rather than installed plugins."
  },
  {
    name: "update",
    isBoolean: true,
    description: 'Forces an update even if registry data is already cached.'
  },
  ...commonOutputParams() // option func setup on 'fields' below
]

const allFields = ['name', 'npmName', 'installed', 'summary', 'handlerCount', 'provider', 'homepage']
parameters.find((o) => o.name === 'fields').optionsFunc = () => allFields

const generateRowText = ({ 
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
  let row = `- ${nameOpen}${p.name}${nameClose}`
  if (p.provider !== undefined) {
    row += ` from ${providerOpen}${p.provider}${providerClose}`
  }
  if (p.installed !== undefined || p.handlerCount !== undefined) {
    row += ` (${ p.installed !== undefined ? `${installedOpen}installed${installedClose}` + (p.handlerCount !== undefined ? '; ' : '') : ''}${p.handlerCount !== undefined ? `${p.handlerCount} handlers` : ''})`
  }
  if (p.summary) {
    row += ': '
    row += p.summary !== undefined ? p.summary : ''
  }
  if (p.npmName !== undefined || p.homepage !== undefined) {
    row += '\n  '
    row += p.npmName !== undefined ? 'NPM: ' + p.npmName + (p.homepage !== undefined ? ' ' : '') : ''
    row += p.homepage !== undefined ? `homepage: ${homepageOpen}${p.homepage}${homepageClose}` : ''
  }

  return row
}

const mdFormatter = ({ data, title }) => `# ${title}\n\n`
  + data.map((p) => generateRowText({ 
      homepageClose: '_', 
      homepageOpen: '_', 
      installedClose: '__',
      installedOpen: '__',
      nameClose: '___', 
      nameOpen: '___', 
      p, 
      providerClose: '__',
      providerOpen: '__'})).join('\n')
  //`- **${p.name}** (${ p.installed !== undefined ? 'installed' + (p.handlerCount !== undefined ? '; ' : '') : ''} ${p.handlerCount} handlers): ${p.summary}`).join('\n') + '\n'

const terminalFormatter = ({ data }) =>
  data.map((p) => generateRowText({ 
      homepageClose: '<rst>', 
      homepageOpen: '<code>',
      installedClose: '<rst>',
      installedOpen: '<em>',
      nameClose: '<rst>', 
      nameOpen: '<h2>', 
      p, 
      providerClose: '<rst>',
      providerOpen: '<bold>'})).join('\n')
// `- <em>${p.name}<rst> (${p.handlerCount} handlers): ${p.summary}`).join('\n') + '\n'

const textFormatter = ({ data }) =>
  data.map((p) => generateRowText({ p })).join('\n')
// `- ${p.name} (${p.handlerCount} handlers): ${p.summary}`).join('\n') + '\n'

const func = ({ app, cache, reporter }) => async (req, res) => {
  const { available, update } = req.vars

  const defaultFields = available === true
    ? ['name', 'summary', 'handlerCount']
    : ['name', 'installed', 'summary', 'provider', 'homepage']

  const data = available === true
    ? await getAvailablePlugins({ app, cache, installedPlugins: app.liq.plugins, update })
    : app.liq.plugins
      .map((p) => ({ name : p.name, summary : p.summary, handlerCount : p.handlersInfo.length, installed: true }))
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

const getAvailablePlugins = async ({ app, cache, installedPlugins, update }) => {
  const registryData = await determineRegistryData({ app, cache, update })

  return Object.values(registryData).reduce((acc, rd) => {
    for (const pluginData of rd.plugins) {
      pluginData.installed = installedPlugins.some((p) => p.name === rd.name)
      acc.push(pluginData)
    }
    return acc
  }, [])
}

export { func, help, method, parameters, path }
