import createError from 'http-errors'

import { httpSmartResponse } from '@liquid-labs/http-smart-response'
import { LIQ_HANDLER_PLUGINS } from '@liquid-labs/liq-defaults'
import { tryExec } from '@liquid-labs/shell-toolkit'

import { appInit } from '../../../app'

const help = {
  name        : 'Plugins remove',
  summary     : 'Removes the named plugin.',
  description : 'Removes the named plugin.'
}
const method = 'delete'
const path = ['server', 'plugins', ':pluginName', 'remove']

const parameters = []

const func = ({ app, cache, model, reporter }) => async(req, res) => {
  const { pluginName } = req.vars

  const pluginData = app.liq.plugins.find(({ name }) => pluginName === name)
  if (!pluginData) {
    throw createError.NotFound(`No such plugin '${pluginName}' found.`)
  }
  // else

  const npmName = pluginData.npmName
  tryExec(`cd "${(LIQ_HANDLER_PLUGINS())}" && npm uninstall ${npmName}`)

  await appInit({ app, model, ...app.liq.config })

  httpSmartResponse({ msg : `Removed '${pluginName}' plugin.`, req, res })
}

export { func, help, method, parameters, path }
