import { httpSmartResponse } from '@liquid-labs/http-smart-response'

const help = {
  name        : 'Plugins remove',
  summary     : 'Removes the named plugin.',
  description : 'Removes the named plugin.'
}
const method = 'delete'
const path = ['server', 'plugins', ':pluginName', 'remove']

const parameters = []

const func = ({ app, cache, reporter }) => async (req, res) => {
  const { pluginName } = req.vars

  console.log(app.router) // DEBUG


  httpSmartResponse({ msg : `Removed '${pluginName}' plugin.`, req, res })
}

export { func, help, method, parameters, path }
