import { listPluginsHandler, listPluginsSetup } from '@liquid-labs/liq-plugins-lib'

const { help, method, parameters } = listPluginsSetup({ pluginsDesc : 'sever endpoint' })

const path = ['server', 'plugins', 'list']

const installedPluginsRetriever = ({ app }) => app.liq.handlerPlugins
const hostVersionRetriever = ({ app }) => app.liq.serverVersion

const func = listPluginsHandler({ hostVersionRetriever, installedPluginsRetriever, pluginType : 'handlers' })

export { func, help, method, parameters, path }
