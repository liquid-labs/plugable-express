import { handlers as registriesHandlers } from './registries'

import * as listHandler from './list'
import * as removeHandler from './remove'

const handlers = [listHandler, removeHandler, ...registriesHandlers]

export { handlers }
