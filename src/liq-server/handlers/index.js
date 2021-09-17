import { handlers } from './playground'

import * as listMethods from './listMethods'
import * as quit from './quit'

handlers.push(listMethods)
handlers.push(quit)

export { handlers }
