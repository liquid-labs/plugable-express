import fsPath from 'node:path'

export const LIQ_HOME = () => process.env.LIQ_HOME || fsPath.join(process.env.HOME, '.liq')
export const LIQ_PLAYGROUND = () => process.env.LIQ_PLAYGROUND || fsPath.join(LIQ_HOME(), 'playground')
export const LIQ_API_SPEC = () => fsPath.join(LIQ_HOME(), 'core-api.json')
export const LIQ_SERVER_DB = () => fsPath.join(LIQ_HOME(), 'server')
export const LIQ_SERVER_PID_FILE = () => fsPath.join(LIQ_SERVER_DB(), 'liq-server.pid')
export const LIQ_HANDLER_PLUGINS = () => process.env.LIQ_PLUGIN_PATH || fsPath.join(LIQ_HOME(), 'plugins', 'handlers')
