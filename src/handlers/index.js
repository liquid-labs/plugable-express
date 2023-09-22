import { handlers as helpHandlers } from './help'
import { handlers as srvrHandlers } from './server'
import { handlers as taskHandlers } from './tasks'

import * as heartbeat from './heartbeat'

const handlers = [
  heartbeat,
  ...helpHandlers,
  ...srvrHandlers,
  ...taskHandlers
]

export { handlers }
