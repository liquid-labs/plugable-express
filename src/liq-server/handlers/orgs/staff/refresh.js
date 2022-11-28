import * as StreamPromises from 'stream/promises'

import { importFromCSV } from '@liquid-labs/import-export'

import {
  canBeAutoDeleted,
  finalizeAllRecords,
  finalizeRecord,
  headerNormalizations,
  headerValidations,
  validateAllRecords,
  validateAndNormalizeRecords
} from './_lib/staff-import-lib'

const method = 'post' // semantically, should be 'put', but 'post' necessary (?) to support file upload
const path = [ 'orgs', ':orgKey', 'staff', 'refresh?' ]
const parameters = [
  {
    name: 'files',
    required: true,
    isMultiValue: true,
    description: 'All the provided files comprise the totality of current employees.'
  },
  {
    name: 'refreshRoles',
    required: false,
    isBoolean: true,
    description: 'By default, the import process only modifies "implicated" roles. I.e., new roles may be added and existing roles "rolled up" where appropriate, but otherwise existing roles are left in place. By setting this parameter to `true`, the roles are refreshed based on the input.'
  }
]

const func = ({ model }) => (req, res) => {
  // if the org path is invalid, then there's no point in doing other work
  const { orgKey } = req.vars
  const org = model.orgs[orgKey]
  if (!org) {
    res.status(400).json({ message: `Could not locate org '${orgKey}'.` })
    return
  }
  
  const { refreshRoles = false } = req.query
  const { files } = req
  
  // TODO: need to reload base data in the face of import failure
  importFromCSV({
    canBeAutoDeleted,
    files,
    finalizeAllRecords,
    finalizeRecord: finalizeRecord(refreshRoles),
    headerNormalizations,
    headerValidations,
    model,
    org,
    res,
    resourceAPI: org.staff,
    validateAllRecords,
    validateAndNormalizeRecords
  })
}

export { func, path, method }
