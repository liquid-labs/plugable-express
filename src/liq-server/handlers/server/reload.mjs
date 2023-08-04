import { LIQ_HANDLER_PLUGINS } from '@liquid-labs/liq-defaults'

import { loadPlugins } from '../../lib'

const method = 'put'
const path = ['server', 'reload']
const parameters = [
  {
    name          : 'pluginPath',
    required      : false,
    isSingleValue : true,
    description   : `The path to search for plugins. Defaults to '${LIQ_HANDLER_PLUGINS()}'`
  }
]

const func = ({ app, cache, model, reporter }) => async(req, res) => {
  const { pluginPath } = req.vars

  model.load()

  // pluginPath default is set by loadPlugins if undef here
  await loadPlugins(app, { cache, model, pluginPath, reporter })

  res.json({ message : 'Model and lugins reloaded.' })
  // res.json(app.ext.handlers)
}

export { func, method, parameters, path }
