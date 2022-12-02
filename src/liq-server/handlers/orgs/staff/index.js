import * as getStaffMember from './get'
import * as getStaffMemberHelp from './get-help'
import * as listStaff from './list'
import * as refreshStaff from './refresh'

const handlers = [
  getStaffMember,
  getStaffMemberHelp,
  listStaff,
  refreshStaff
]

export { handlers }
