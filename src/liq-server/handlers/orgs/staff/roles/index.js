import { handlers } from './access'
import * as getRoles from './get'

handlers.push(getRoles)

export { handlers }
