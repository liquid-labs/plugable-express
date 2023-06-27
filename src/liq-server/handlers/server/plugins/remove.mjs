import { LIQ_HANDLER_PLUGINS } from '@liquid-labs/liq-defaults'
import { removePluginsHandler, removePluginsSetup } from '@liquid-labs/liq-plugins-lib'

const { help, method, parameters } = removePluginsSetup({ pluginsDesc : 'sever endpoint' })

const path = ['server', 'plugins', ':handlerPluginName', 'remove']

const installedPluginsRetriever = ({ app }) => app.liq.handlerPlugins
const pluginPkgDirRetriever = LIQ_HANDLER_PLUGINS

const func = removePluginsHandler({
  installedPluginsRetriever,
  nameKey    : 'handlerPluginName',
  pluginPkgDirRetriever,
  reloadFunc : ({ app, ...options }) => app.reload({ app, ...options })
})

export { func, help, method, parameters, path }
