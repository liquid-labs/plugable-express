import createError from 'http-errors'

import { httpSmartResponse } from '@liquid-labs/http-smart-response'

const help = {
  name        : 'Plugins details',
  summary     : 'Provides details on the named plugin.',
  description : 'Provides details on the named plugin.'
}
const method = 'get'
const path = ['server', 'plugins', ':pluginName', 'details']

const parameters = []

const func = ({ app, cache, model, reporter }) => async(req, res) => {
  const { pluginName } = req.vars

  const pluginData = app.liq.plugins.find(({ name }) => pluginName === name)
  if (!pluginData) {
    throw createError.NotFound(`No such plugin '${pluginName}' found.`)
  }
  // else

  httpSmartResponse({ data : pluginData, req, res })
}

export { func, help, method, parameters, path }
