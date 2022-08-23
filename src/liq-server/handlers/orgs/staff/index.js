import * as getStaffMember from './get'
import * as listStaff from './list'
import * as refreshStaff from './post'

const handlers = [
  getStaffMember,
  listStaff,
  refreshStaff
]

export { handlers }
