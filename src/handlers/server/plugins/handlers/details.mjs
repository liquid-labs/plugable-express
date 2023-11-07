import { detailsPluginHandler, detailsPluginSetup } from '@liquid-labs/liq-plugins-lib'

const { help, method, parameters } = detailsPluginSetup({ pluginsDesc : 'sever endpoint' })

const pluginNameKey = 'handlerPluginName'

const path = ['server', 'plugins', 'handlers', ':' + pluginNameKey, 'details']

const installedPluginsRetriever = ({ app }) => app.ext.handlerPlugins

const func = detailsPluginHandler({ installedPluginsRetriever, nameKey: pluginNameKey })

export { func, help, method, parameters, path }
