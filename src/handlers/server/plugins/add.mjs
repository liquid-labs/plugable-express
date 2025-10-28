import { httpSmartResponse } from '@liquid-labs/http-smart-response'

import { installPlugins } from './_lib/install-plugins'

// Handler setup and implementation
const pluginType = 'server'

const help = {
  name        : `add ${pluginType} plugins`,
  summary     : `Installs one or more ${pluginType} plugins.`,
  description : `Installs one or more ${pluginType} plugins.`
}

const method = 'put'

const parameters = [
  {
    name         : 'npmNames',
    isMultivalue : true,
    description  : 'The plugins to install, by their NPM package name. Plugins must have the \'pluggable-endpoints\' keyword. Include multiple times to install multiple plugins.'
  }
]

const path = ['server', 'plugins', 'add']

const func = ({ app, reporter }) => async(req, res) => {
  const installedPlugins = app.ext.handlerPlugins || []
  const { npmNames } = req.vars
  // Use dynamicPluginInstallDir if provided, otherwise use current working directory
  const pluginPkgDir = app.ext.dynamicPluginInstallDir || app.ext.serverHome

  const { msg, data } = await installPlugins({
    installedPlugins,
    npmNames,
    pluginPkgDir,
    reloadFunc : () => app.reload(),
    reporter
  })

  httpSmartResponse({ data, msg, req, res })
}

export { func, help, method, parameters, path, installPlugins }
