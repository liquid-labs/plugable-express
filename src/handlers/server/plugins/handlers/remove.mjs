import { removePluginsHandler, removePluginsSetup } from '@liquid-labs/liq-plugins-lib'

const { help, method, parameters } = removePluginsSetup({ pluginsDesc : 'sever endpoint' })

const path = ['server', 'plugins', 'handlers', ':handlerPluginName', 'remove']

const installedPluginsRetriever = ({ app }) => app.ext.handlerPlugins

const func = removePluginsHandler({
  installedPluginsRetriever,
  nameKey               : 'handlerPluginName',
  pluginPkgDirRetriever : ({ app }) => app.ext.pluginsPath,
  reloadFunc            : ({ app, ...options }) => app.reload({ app, ...options })
})

export { func, help, method, parameters, path }
