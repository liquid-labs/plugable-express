import { listPluginsHandler, listPluginsSetup } from '@liquid-labs/liq-plugins-lib'

const { help, method, parameters } = listPluginsSetup({ pluginsDesc : 'sever endpoint' })

const path = ['server', 'plugins', 'handlers', 'list']

const installedPluginsRetriever = ({ app }) => app.ext.handlerPlugins
const hostVersionRetriever = ({ app }) => app.ext.serverVersion

const func = listPluginsHandler({ hostVersionRetriever, installedPluginsRetriever, pluginType : 'handlers' })

export { func, help, method, parameters, path }
