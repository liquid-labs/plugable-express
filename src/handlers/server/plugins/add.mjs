import { httpSmartResponse } from '@liquid-labs/http-smart-response'

import { determineRegistryData } from './_lib/registry-utils'
import { selectMatchingPlugins } from './_lib/plugin-selection'
import { installPlugins } from './_lib/install-plugins'

// Handler setup and implementation
const hostVersionRetriever = ({ app }) => app.ext.serverVersion
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
    description  : 'The plugins to install, by their NPM package name. Include multiple times to install multiple plugins.',
    optionsFunc  : async({ app, cache, reporter }) => {
      if (app.ext.noRegistries === true) {
        return []
      }
      const hostVersion = hostVersionRetriever({ app })
      const registryData = await determineRegistryData({
        cache,
        registries : app.ext.serverSettings.registries,
        reporter
      })
      const plugins = selectMatchingPlugins({ hostVersion, pluginType, registryData })
      return plugins.map(({ npmName }) => npmName)
    }
  }
]

const path = ['server', 'plugins', 'add']

const func = ({ app, cache, reporter }) => async(req, res) => {
  const installedPlugins = app.ext.handlerPlugins || []
  const { npmNames } = req.vars
  const hostVersion = app.ext.serverVersion
  const pluginPkgDir = app.ext.pluginsPath

  const msg = await installPlugins({
    app,
    cache,
    hostVersion,
    installedPlugins,
    npmNames,
    pluginPkgDir,
    pluginType,
    reloadFunc : ({ app }) => app.reload(),
    reporter
  })

  httpSmartResponse({ msg, req, res })
}

export { func, help, method, parameters, path, installPlugins }
