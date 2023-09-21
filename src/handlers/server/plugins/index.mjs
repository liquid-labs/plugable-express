import { handlers as handlerPluginHandlers } from './handlers'
import { handlers as registriesHandlers } from './registries'

const handlers = [...handlerPluginHandlers, ...registriesHandlers]

export { handlers }
