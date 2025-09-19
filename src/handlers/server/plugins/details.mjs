import createError from 'http-errors'
import { httpSmartResponse } from '@liquid-labs/http-smart-response'

const detailsPluginSetup = ({ pluginsDesc }) => {
  const help = {
    name        : `${pluginsDesc} plugins details`,
    summary     : 'Provides details on the named plugin.',
    description : 'Provides details on the named plugin.'
  }
  const method = 'get'

  const parameters = []

  return { help, method, parameters }
}

const detailsPluginHandler = ({ installedPluginsRetriever, nameKey }) =>
  ({ app, reporter }) => async(req, res) => {
    const installedPlugins = installedPluginsRetriever({ app, req }) || []
    const pluginName = req.vars[nameKey]

    const pluginData = installedPlugins.find(({ npmName }) => pluginName === npmName)
    if (!pluginData) {
      throw createError.NotFound(`No such plugin '${pluginName}' found.`)
    }
    // else

    httpSmartResponse({ data : pluginData, req, res })
  }

const { help, method, parameters } = detailsPluginSetup({ pluginsDesc : 'server endpoint' })

const pluginNameKey = 'serverPluginName'

const path = ['server', 'plugins', ':' + pluginNameKey, 'details']

const installedPluginsRetriever = ({ app }) => app.ext.handlerPlugins

const func = detailsPluginHandler({ installedPluginsRetriever, nameKey : pluginNameKey })

export { func, help, method, parameters, path }
