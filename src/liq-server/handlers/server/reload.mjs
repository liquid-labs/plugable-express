import { defaultPluginPath, loadPlugins } from '../../lib'

const method = 'put'
const path = [ 'server', 'reload' ]
const parameters = [
  {
    name: 'pluginPath',
    required: false,
    isSingleValue: true,
    description: `The path to search for plugins. Defaults to '${defaultPluginPath}'`
  }
]

const func = ({ app, cache, model, reporter }) => async (req, res) => {
  const { pluginPath } = req.query
  
  // pluginPath default is set by loadPlugins is undef here
  await loadPlugins(app, { cache, model, pluginPath, reporter })
  
  res.json({ message: "Plugins loaded." })
  // res.json(app.handlers)
}

export { func, method, parameters, path }
