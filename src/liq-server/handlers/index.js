import { handlers as orgsHandlers } from './orgs'
import { handlers as pgHandlers } from './playground'

import * as get from './get'
import * as options from './options'
import * as unbind from './unbind'

const handlers = orgsHandlers
handlers.push(...pgHandlers)

handlers.push(get, options, unbind)

export { handlers }
