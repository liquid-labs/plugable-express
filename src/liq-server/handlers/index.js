import { handlers as orgsHandlers } from './orgs'
import { handlers as pgHandlers } from './playground'

import * as get from './get'
import * as listMethods from './get-listMethods'
import * as unbind from './unbind'

const handlers = orgsHandlers
handlers.push(...pgHandlers)

handlers.push(get)
handlers.push(listMethods)
handlers.push(unbind)

export { handlers }
