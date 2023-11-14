import { addPluginsHandler, addPluginsSetup } from '@liquid-labs/liq-plugins-lib'

const hostVersionRetriever = ({ app }) => app.ext.serverVersion

const pluginsDesc = 'server endpoint'

const { help, method, parameters } =
  addPluginsSetup({ hostVersionRetriever, pluginsDesc, pluginType : 'handlers' })

const path = ['server', 'plugins', 'handlers', 'add']

const installedPluginsRetriever = ({ app }) => app.ext.handlerPlugins

const func = addPluginsHandler({
  hostVersionRetriever,
  installedPluginsRetriever,
  pluginsDesc,
  pluginPkgDirRetriever : ({ app }) => app.ext.pluginsPath,
  pluginType            : 'handlers',
  reloadFunc            : ({ app }) => app.reload()
})

export { func, help, method, parameters, path }
