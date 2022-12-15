import { handlers as credentials } from './credentials'
import { handlers as helpHandlers } from './help'
import { handlers as orgsHandlers } from './orgs'
import { handlers as pgHandlers } from './playground'
import { handlers as srvrHandlers } from './server'
import { handlers as taskHandlers } from './tasks'

import * as heartbeat from './heartbeat'

const handlers = [
  heartbeat,
  ...credentials,
  ...helpHandlers,
  ...orgsHandlers,
  ...pgHandlers,
  ...srvrHandlers,
  ...taskHandlers
]

export { handlers }
