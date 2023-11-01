import { handlers as bundleHandlers } from './bundles'
import { handlers as handlerPluginHandlers } from './handlers'
import { handlers as registriesHandlers } from './registries'

const handlers = [...bundleHandlers, ...handlerPluginHandlers, ...registriesHandlers]

export { handlers }
