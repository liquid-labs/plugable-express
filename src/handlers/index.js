import { handlers as helpHandlers } from './help'
import { handlers as srvrHandlers } from './server'

import * as heartbeat from './heartbeat'

const handlers = [
  heartbeat,
  ...helpHandlers,
  ...srvrHandlers
]

export { handlers }
