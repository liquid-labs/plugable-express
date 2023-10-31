import { handlers } from './errors'
import { handlers as pluginHandlers } from './plugins'

import * as api from './api'
import * as nextCommands from './next-commands'
import * as reload from './reload'
import * as stop from './stop'
import * as version from './version'

handlers.push(api, nextCommands, reload, stop, version, ...pluginHandlers)

export { handlers }
