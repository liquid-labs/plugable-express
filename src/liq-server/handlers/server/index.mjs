import * as api from './api'
import * as get from './get'
import * as reload from './reload'
import * as stop from './stop'

const handlers = [ api, get, reload, stop ]

export { handlers }
