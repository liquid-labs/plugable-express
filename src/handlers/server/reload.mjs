import { loadPlugins } from '../../lib'

const method = 'put'
const path = ['server', 'reload']
const parameters = [
  {
    name          : 'pluginsPath',
    required      : false,
    isSingleValue : true,
    description   : 'The path to search for plugins, overriding the server default.'
  }
]

const func = ({ app, cache, model, reporter }) => async(req, res) => {
  const { pluginsPath } = req.vars

  model.load()

  // pluginPath default is set by loadPlugins if undef here
  await loadPlugins(app, { cache, model, pluginsPath, reporter })

  res.json({ message : 'Model and lugins reloaded.' })
  // res.json(app.ext.handlers)
}

export { func, method, parameters, path }
