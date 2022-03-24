import { handlers } from './roles'
import * as listStaff from './list'
import * as refreshStaff from './post'

handlers.push(listStaff, refreshStaff)

export { handlers }
