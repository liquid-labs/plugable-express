import * as deleteStaffMember from './delete'
import * as getStaffMember from './get'
import * as listStaff from './list'
import * as refreshStaff from './refresh'

const handlers = [
  deleteStaffMember,
  getStaffMember,
  listStaff,
  refreshStaff
]

export { handlers }
