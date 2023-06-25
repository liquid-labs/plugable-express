import { detailsPluginHandler, detailsPluginSetup } from '@liquid-labs/liq-plugins-lib'

const { help, method, parameters } = detailsPluginSetup({ pluginsDesc : 'sever endpoint' })

const path = ['server', 'plugins', ':pluginName', 'details']

const installedPluginsRetriever = ({ app }) => app.liq.plugins

const func = detailsPluginHandler({ installedPluginsRetriever })

export { func, help, method, parameters, path }
