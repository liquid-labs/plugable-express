import { removePluginsHandler, removePluginsSetup } from '@liquid-labs/liq-plugins-lib'

const { help, method, parameters } = removePluginsSetup({ pluginsDesc : 'sever endpoint' })

const pluginNameKey = 'serverPluginName'

const path = ['server', 'plugins', ':' + pluginNameKey, 'remove']

const installedPluginsRetriever = ({ app }) => app.ext.handlerPlugins

const func = removePluginsHandler({
  installedPluginsRetriever,
  nameKey               : pluginNameKey,
  pluginPkgDirRetriever : ({ app }) => app.ext.pluginsPath,
  reloadFunc            : ({ app }) => app.reload()
})

export { func, help, method, parameters, path }
