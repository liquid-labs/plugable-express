import fsPath from 'node:path'

export const LIQ_HOME = process.env.LIQ_HOME || fsPath.join(process.env.HOME, '.liq')
export const LIQ_API_SPEC = fsPath.join(LIQ_HOME, 'core-api.json')
export const LIQ_SERVER_DB = fsPath.join(LIQ_HOME, 'server')
export const LIQ_SERVER_PID_FILE = fsPath.join(LIQ_SERVER_DB, 'liq-server.pid')
export const LIQ_CORE_PLUGINS = fsPath.join(LIQ_HOME, 'plugins', 'core')