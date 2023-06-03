import fsPath from 'node:path'

export const LIQ_HOME = fsPath.join(process.env.HOME, '.liq')
export const LIQ_SERVER_DB = fsPath.join(LIQ_HOME, 'server')
export const LIQ_SERVER_PID_FILE = fsPath.join(LIQ_SERVER_DB, 'liq-server.pid')
export const LIQ_SERVER_PGREP_MATCH = "-f '^node' 'liq-server.js$'"

export const LIQ_SERVER_STATUS_RUNNING = 0
export const LIQ_SERVER_STATUS_STOPPED = 101
export const LIQ_SERVER_STATUS_WORKING = 102 // it's doing something, state uncertain
export const LIQ_SERVER_STATUS_RECOVERABLE = 103
export const LIQ_SERVER_STATUS_UNRECOVERABLE = 104
