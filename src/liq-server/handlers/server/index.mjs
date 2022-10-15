import * as api from './api'
import * as get from './get'
import * as nextCommands from './next-commands'
import * as reload from './reload'
import * as stop from './stop'

const handlers = [ api, get, nextCommands, reload, stop ]

export { handlers }
