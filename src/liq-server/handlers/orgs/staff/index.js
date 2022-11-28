import * as getStaffMember from './get'
import * as listStaff from './list'
import * as refreshStaff from './refresh'

const handlers = [
  getStaffMember,
  listStaff,
  refreshStaff
]

export { handlers }
