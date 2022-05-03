import { handlers as orgsHandlers } from './orgs'
import { handlers as pgHandlers } from './playground'
import { handlers as taskHandlers } from './tasks'

import * as get from './get'
import * as options from './options'
import * as reload from './reload'
import * as unbind from './unbind'

const handlers = orgsHandlers
handlers.push(...pgHandlers)
handlers.push(...taskHandlers)

handlers.push(get, options, reload, unbind)

export { handlers }
