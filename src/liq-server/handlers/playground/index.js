import { handlers as orgHandlers } from './orgs'
import { handlers as projectHandlers } from './projects'

import * as getPlayground from './get'
import * as rebindPlayground from './rebind'

const handlers = orgHandlers.concat(projectHandlers)

handlers.push(getPlayground, rebindPlayground)

export { handlers }
