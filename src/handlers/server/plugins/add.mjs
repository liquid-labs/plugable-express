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
    description  : 'The plugins to install, by their NPM package name. Include multiple times to install multiple plugins.'
  },
  {
    name        : 'noImplicitInstallation',
    isBoolean   : true,
    description : 'Skips default installation of implicit plugin dependencies optionally defined in a plugins \'plugable-express.yaml\' file.'
  }
]

const path = ['server', 'plugins', 'add']

const func = ({ app, reporter }) => async(req, res) => {
  const installedPlugins = app.ext.handlerPlugins || []
  const { npmNames, noImplicitInstallation } = req.vars
  const pluginPkgDir = app.ext.pluginsPath

  const { msg, data } = await installPlugins({
    app,
    installedPlugins,
    noImplicitInstallation,
    npmNames,
    pluginPkgDir,
    reloadFunc : ({ app }) => app.reload(),
    reporter
  })

  httpSmartResponse({ data, msg, req, res })
}

export { func, help, method, parameters, path, installPlugins }
