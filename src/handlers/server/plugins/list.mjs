import { listPluginsHandler, listPluginsSetup } from '@liquid-labs/liq-plugins-lib'

const { help, method, parameters } = listPluginsSetup({ pluginsDesc : 'sever endpoint' })

const path = ['server', 'plugins', 'list']

const installedPluginsRetriever = ({ app }) => app.ext.handlerPlugins
const hostVersionRetriever = ({ app }) => app.ext.serverVersion

const func = listPluginsHandler({ hostVersionRetriever, installedPluginsRetriever, pluginType : 'server' })

export { func, help, method, parameters, path }
