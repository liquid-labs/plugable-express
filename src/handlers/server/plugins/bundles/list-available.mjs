import { commonOutputParams, formatOutput } from '@liquid-labs/liq-handlers-lib'

import { getServerBundles } from './_lib/get-server-bundles'

const help = {
  name        : 'Bundles list available',
  summary     : 'List available bundles.',
  description : 'List bundles defined by the registered registries.'
}
const method = 'get'
const path = ['server', 'plugins', 'bundles', 'list-available']

const parameters = [
  {
    name        : 'update',
    isBoolean   : true,
    description : 'If true, will update registry data even if cached.'
  },
  ...commonOutputParams() // option func setup on 'fields' below
]

const allFields = ['name']
const defaultFields = allFields

const mdFormatter = ({ data, title }) => `# ${title}\n\n` + (data?.length > 0
  ? '- '
  + data.map(({ name }) => name).join('\n- ')
  : '') + '\n'
const textFormatter = ({ data }) => (data?.length > 0 ? '- ' + data.map(({ name }) => name).join('\n- ') : '') + '\n'
const terminalFormatter = ({ data }) => (data?.length > 0
  ? '- <em>' + data.map(({ name }) => name).join('<rst>\n- <em>') + '<rst>'
  : '') + '\n'

const func = ({ app, cache, reporter }) => async(req, res) => {
  const { update = false } = req.vars

  const data = await getServerBundles({ app, cache, update })

  formatOutput({
    ...req.vars,
    basicTitle : 'Available bundles',
    data,
    allFields,
    defaultFields,
    mdFormatter,
    terminalFormatter,
    textFormatter,
    reporter,
    req,
    res
  })
}

export { func, help, method, parameters, path }
