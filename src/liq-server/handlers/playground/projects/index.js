import * as getPackage from './get-packageJSON'
import * as updatePackage from './update'

const handlers = [
  getPackage,
  updatePackage
]

export { handlers }
