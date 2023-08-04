import { detailsPluginHandler, detailsPluginSetup } from '@liquid-labs/liq-plugins-lib'

const { help, method, parameters } = detailsPluginSetup({ pluginsDesc : 'sever endpoint' })

const path = ['server', 'plugins', ':handlerPluginName', 'details']

const installedPluginsRetriever = ({ app }) => app.ext.handlerPlugins

const func = detailsPluginHandler({ installedPluginsRetriever })

export { func, help, method, parameters, path }
