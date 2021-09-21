import { handlers } from './playground'

import * as get from './get'
import * as listMethods from './get-listMethods'
import * as unbind from './unbind'

handlers.push(get)
handlers.push(listMethods)
handlers.push(unbind)

export { handlers }
