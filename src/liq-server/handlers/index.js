import { handlers as orgsHandlers } from './orgs'
import { handlers as pgHandlers } from './playground'

import * as get from './get'
import * as unbind from './unbind'

const handlers = orgsHandlers
handlers.push(...pgHandlers)

handlers.push(get, unbind)

export { handlers }
