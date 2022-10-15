import { handlers as orgsHandlers } from './orgs'
import { handlers as pgHandlers } from './playground'
import { handlers as srvrHandlers } from './server'
import { handlers as taskHandlers } from './tasks'

import * as heartbeat from './heartbeat'
import * as help from './help'

const handlers = orgsHandlers
handlers.push(...pgHandlers)
handlers.push(...srvrHandlers)
handlers.push(...taskHandlers)

handlers.push(heartbeat, help)

export { handlers }
