import * as field from './staff-import-fields'

// validation data and functions
const headerNormalizations = [
  [ /company/i, field.COMPANY ],
  [ /email/i, field.EMAIL ],
  [ /full *name/i, field.FULL_NAME ],
  [ /(given|first) *name/i, field.GIVEN_NAME ],
  [ /(surname|last *name)/i, field.FAMILY_NAME ],
  [ /nickname/i, field.NICKNAME ],
  [ /title/i, field.TITLE ],
  [ /start date/i, field.START_DATE ],
  [ /end *date/i, field.END_DATE ],
  [ /employment *status/i, field.EMPLOYMENT_STATUS ]
]

/**
* Validates:
* - `email` is present
* - `title` is present
* - either `givenName` and `surname` are present or `fullName` is present
*/
const headerValidations = [
  // note, fast-csv/parse will check for duplicate headers, so we don't have too
  // Keeping the field checks separets allows us to report both if both fail.
  (newHeaders) => newHeaders.indexOf(field.EMAIL) > -1 ? null : `missing '${field.EMAIL}' column.`,
  (newHeaders) => newHeaders.indexOf(field.TITLE) > -1 ? null : `missing '${field.TITLE}' column.`,
  // TODO: support warnings?
  // (newHeaders) => newHeaders.indexOf(field.START_DATE) > -1 ? null : `missing '${field.START_DATE}' column.`,
  (newHeaders) =>
    newHeaders.indexOf(field.GIVEN_NAME) > -1
      ? null // we have a given name, good
      : newHeaders.indexOf(field.FULL_NAME) > -1
        ? null // we have no given name, but we'll try and extract it, so good for now
        : `you must provide either '${field.FAMILY_NAME}', '${field.FULL_NAME}', or both.`,
]

// record normalization functions

// Note, this RE relies on the field value being having been trimmed.
const nicknameExtractor = /"([^"]+)"|"([^"]+)"/

// If nickname is not explicitly defined already, then checks the full name
const normalizeNickname = (rec) => {
  const fullName = rec[field.FULL_NAME]
  if (!rec[field.NICKNAME] && fullName) {
    const match = fullName.match(nicknameExtractor)
    if (match) {
      const newRec = Object.assign({}, rec)
      newRec[field.NICKNAME] = match[1] || match[2]
      
      return newRec
    }
  }
  
  return rec
}

const lastNameFirst = /[,;]/
// Notice we allow for "Pablo Diego Fransico DePaulo ... Picaso" :)
// const bitsExtractor = /^([^" ]+)( +.*|( *[,;])?.*([^" ]+)?$/
const bitsExtractor = /^([^" ]+)?[,;]?(.*[" ])?([^" ]+)$/

const errorContext = (field, value) => `field '${field}' with value '${value}'`

// If given name and/or surname are not defined, then extracts them from the `field.FULL_NAME`, which is assumed to be
// present (validated with `headerValidations`).
const normalizeNames = (rec) => {
  if (!rec[field.GIVEN_NAME] || !rec[field.FAMILY_NAME]) {
    const fullName = rec[field.FULL_NAME]
    // Note, though we are guaranteed that either given and full names are present, we could have both without surname,
    // in which case we will attempt to extract it
    if (fullName) {
      const bitsMatch = fullName.match(bitsExtractor)
      if (!bitsMatch)
        throw new Error(`Could not extract useful data from ${errorContext(field.FULL_NAME, fullName)}; is it empty?`)
      
      const newRec = Object.assign({}, rec)
      
      const updateNames = (extractedSurname, extractedGivenName) => {
        // We always need a given name
        if (!extractedGivenName) throw new Error(`Could not identify given name in ${errorContext(field.FULL_NAME, fullName)}.`)
        // If we have an extracted given name and a specified given name, they must match (ignoring case)
        if (rec[field.GIVEN_NAME] && extractedGivenName.toLowerCase() !== rec[field.GIVEN_NAME].toLowerCase())
          throw new Error(`Extracted given name '${extractedGivenName}' from full name '${fullName}' but it does not match specified given name '${rec[field.GIVEN_NAME]}'`)
        // ditto for surname
        if (rec[field.FAMILY_NAME] && rec[field.FAMILY_NAME] !== extractedSurname)
          throw new Error(`Extracted surname '${extractedGivenName}' from full name '${fullName}' but it does not match specified surname '${rec[field.GIVEN_NAME]}'`)
          
        // now, for the updates!
        // If no specified given name, but we have an extracted given name, use it
        if (newRec[field.GIVEN_NAME] === undefined) newRec[field.GIVEN_NAME] = extractedGivenName
        // ditto for surname TODO: was 'rec[field.FAMILY_NAME] === undefined'; changed for consistency, just noting in case this blows up somehow
        if (newRec[field.FAMILY_NAME] === undefined && extractedSurname) newRec[field.FAMILY_NAME] = extractedSurname
        
        return newRec
      }
      
      // 'updateNames' returns the record
      return fullName.match(lastNameFirst)
        ? updateNames(bitsMatch[1], bitsMatch[3])
        : updateNames(bitsMatch[3], bitsMatch[1])
    }
    // else we have no fullname and at least a given name, so we can just return the rec
  }
  
  return rec
}

const validateAndNormalizeRecords = (records) => {
  return records.map((rec) => {
    for (const normalizer of [ normalizeNickname, normalizeNames ]) {
      rec = normalizer(rec)
    }
    return rec
  })
}

/**
* Finalizing the record may have side effects, which should be desribed with an`actionSummary` entry.
*/
const finalizeRecord = ({ actionSummary, newRecord, org }) => {
  const { email, title: titleSpec, _sourceFileName } = newRecord
  newRecord.roles = []
  const currRecord = org.staff.get(email, { rawData : true })
  
  if (currRecord !== undefined)
    newRecord = Object.assign({}, currRecord, newRecord)
  
  const titles = titleSpec.split(/\s*[;]\s*/)
  
  titles.forEach((title, i) => {
    const [ roleName, manager ] = title.split('/')
    const [ role, qualifier ] = org.roles.fuzzyGet(roleName, { fuzzy: true, includeQualifier: true })
    if (role === undefined) {
      errors.push(`Could not find role for title '${title}' while processing staff record for '${email}' from '${_sourceFileName}'.`)
      return
    }
    
    // TODO: we could skip the pre-emptive creation once we update later processing to ignore / drop non-truthy 'qualifier' entries
    let roleDef = { name: role.name }
    if (qualifier !== undefined) roleDef.qualifier = qualifier
    if (manager !== undefined) roleDef.manager = manager
    if (currRecord !== undefined) { // it's an update and we need to reconcile changes in the role
      const currRoleData = currRecord.roles.find((r) => r.name === roleDef.name)
      if (!currRoleData) {
        // then we are adding a new role
        actionSummary.push(`Added role '${role.name}' to '${email}'.`)
      }
      else {
        roleDef = Object.assign({}, currRoleData, roleDef)
      }
    }
    
    newRecord.roles.push(roleDef)
  }) // multi-title forEach loop
  
  // new we need to check if any roles have been removed
  for (const oldRole of currRecord.roles) {
    if (!newRecord.roles.some((r) => r.name === oldRole.name)) {
      actionSummary.push(`Removed role '${oldRole.name}' from '${email}'.`)
    }
  }
  
  return newRecord
}

/**
* Verifies whether the current record can be deleted automatically. In our case, 'board' and 'logical' staff don't show
* up in the reports, but are non-deletable.
*
* ### Parameters
*
* - `employmentStatus` (from imported record): indicates the nature of employment
*/
const canBeAutoDeleted = ({ employmentStatus }) => employmentStatus !== 'board' && employmentStatus !== 'logical'

const testables = { // exported for testing
  normalizeNames,
  normalizeNickname
}

export {
  canBeAutoDeleted,
  field, // re-export from here to maintain clear field names for both this file and subsequent consumers
  finalizeRecord,
  headerNormalizations,
  headerValidations,
  testables,
  validateAndNormalizeRecords
}
