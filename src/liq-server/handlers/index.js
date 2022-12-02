import { handlers as helpHandlers } from './help'
import { handlers as orgsHandlers } from './orgs'
import { handlers as pgHandlers } from './playground'
import { handlers as srvrHandlers } from './server'
import { handlers as taskHandlers } from './tasks'

import * as heartbeat from './heartbeat'

const handlers = [...helpHandlers]
handlers.push(...orgsHandlers)
handlers.push(...pgHandlers)
handlers.push(...srvrHandlers)
handlers.push(...taskHandlers)

export { handlers }
