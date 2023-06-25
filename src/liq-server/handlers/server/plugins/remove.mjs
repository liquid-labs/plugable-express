import { LIQ_HANDLER_PLUGINS } from '@liquid-labs/liq-defaults'
import { removePluginsHandler, removePluginsSetup } from '@liquid-labs/liq-plugins-lib'

const { help, method, parameters } = removePluginsSetup({ pluginsDesc : 'sever endpoint' })

const path = ['server', 'plugins', ':pluginName', 'remove']

const installedPluginsRetriever = ({ app }) => app.liq.plugins
const pluginPkgDir = LIQ_HANDLER_PLUGINS()

const func = removePluginsHandler({ installedPluginsRetriever, pluginPkgDir })

export { func, help, method, parameters, path }
