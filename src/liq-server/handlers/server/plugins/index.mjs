import { handlers as registriesHandlers } from './registries'

import * as listHandler from './list'

const handlers = [listHandler, ...registriesHandlers]

export { handlers }
