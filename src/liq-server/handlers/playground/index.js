import { handlers as orgHandlers } from './orgs'
import { handlers as projectHandlers } from './projects'

const handlers = orgHandlers.concat(projectHandlers)

export { handlers }
