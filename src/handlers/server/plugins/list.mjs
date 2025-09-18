import { listPluginsHandler, listPluginsSetup } from '@liquid-labs/liq-plugins-lib'
import { listPlugins } from './_lib/list-plugins'

const { help, method, parameters } = listPluginsSetup({ pluginsDesc : 'sever endpoint' })

const path = ['server', 'plugins', 'list']

const installedPluginsRetriever = ({ app }) => listPlugins({ app })
const hostVersionRetriever = ({ app }) => app.ext.serverVersion

const func = listPluginsHandler({ hostVersionRetriever, installedPluginsRetriever, pluginType : 'server' })

export { func, help, method, parameters, path }
