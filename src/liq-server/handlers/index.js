import { handlers } from './playground'

import * as listMethods from './get-listMethods'
import * as quit from './unbind'

handlers.push(listMethods)
handlers.push(quit)

export { handlers }
