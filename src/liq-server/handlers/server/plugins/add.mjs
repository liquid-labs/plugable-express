import { LIQ_HANDLER_PLUGINS } from '@liquid-labs/liq-defaults'
import { addPluginsHandler, addPluginsSetup } from '@liquid-labs/liq-plugins-lib'

const hostVersionRetriever = ({ app }) => app.liq.serverVersion

const { help, method, parameters } = 
  addPluginsSetup({ hostVersionRetriever, pluginsDesc: 'sever endpoint', pluginType: 'handlers' })

const path = ['server', 'plugins', 'add']

const installedPluginsRetriever = ({ app }) => app.liq.plugins
const pluginPkgDir = LIQ_HANDLER_PLUGINS()

const func = addPluginsHandler({ hostVersionRetriever, installedPluginsRetriever, pluginPkgDir, pluginType: 'handler' })

export { func, help, method, parameters, path }
