import * as field from './staff-import-fields'

// validation data and functions
const headerNormalizations = [
  [ /company/i, field.COMPANY ],
  [ /e-?mail/i, field.EMAIL ],
  [ /(?:full|emp(?:loyee)?) *name/i, field.FULL_NAME ],
  [ /(given|first) *name/i, field.GIVEN_NAME ],
  [ /(surname|last *name)/i, field.FAMILY_NAME ],
  [ /nickname/i, field.NICKNAME ],
  [ /title|designation|role/i, field.ROLES ],
  [ /start *date/i, field.START_DATE ],
  [ /end *date/i, field.END_DATE ],
  [ /employment *status/i, field.EMPLOYMENT_STATUS ],
  [ /manager/i, field.MANAGER ]
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
  // We don't need much, just email and some name.
  (newHeaders) => newHeaders.indexOf(field.EMAIL) > -1 ? null : `missing '${field.EMAIL}' column.`,
  (newHeaders) =>
    newHeaders.indexOf(field.FAMILY_NAME) > -1
      ? null // we have an explicit family name, good
      : newHeaders.indexOf(field.FULL_NAME) > -1
        ? null // we have no family name, but we'll try and extract it, so good for now
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

const corpTest = /[;, ](?:l\.?l\.?c\.?|corp(?:\.|oration)?|inc(?:\.|orporation)?)\s*["]?\s*$/i
const familyNameFirstTest = /[,;]/
// Notice we allow for "Pablo Diego Fransico DePaulo ... Picaso" :)
// const bitsExtractor = /^([^" ]+)( +.*|( *[,;])?.*([^" ]+)?$/
const bitsExtractor = /^"?([^", ]+)?[,;]?\s*(?:([^", ]*)[," ]+)?([^"]+)$/

const errorContext = (field, value) => `field '${field}' with value '${value}'`

// If given name and/or surname are not defined, then extracts them from the `field.FULL_NAME`, which is assumed to be
// present (validated with `headerValidations`).
const normalizeNames = (rec) => {
  if (!rec[field.GIVEN_NAME] || !rec[field.FAMILY_NAME]) {
    const fullName = rec[field.FULL_NAME]
    // Note, though we are guaranteed that either given and full names are present, we could have both without surname,
    // in which case we will attempt to extract it
    if (fullName) {
      const newRec = Object.assign({}, rec)
      if (fullName.match(corpTest)) {
        newRec[field.FAMILY_NAME] = fullName
        return newRec
      }
      
      const bitsMatch = fullName.match(bitsExtractor)
      if (!bitsMatch)
        throw new Error(`Could not extract useful data from ${errorContext(field.FULL_NAME, fullName)}; is it empty?`)
      
      const updateNames = (extractedFamilyName, extractedGivenName) => {
        // We always need a given name
        if (!extractedGivenName) throw new Error(`Could not identify given name in ${errorContext(field.FULL_NAME, fullName)}.`)
        // If we have an extracted given name and a specified given name, they must match (ignoring case)
        if (rec[field.GIVEN_NAME] && extractedGivenName.toLowerCase() !== rec[field.GIVEN_NAME].toLowerCase())
          throw new Error(`Extracted given name '${extractedGivenName}' from full name '${fullName}' but it does not match specified given name '${rec[field.GIVEN_NAME]}'`)
        // ditto for surname
        if (rec[field.FAMILY_NAME] && rec[field.FAMILY_NAME] !== extractedFamilyName)
          throw new Error(`Extracted surname '${extractedGivenName}' from full name '${fullName}' but it does not match specified surname '${rec[field.GIVEN_NAME]}'`)
          
        // now, for the updates!
        // If no specified given name, but we have an extracted given name, use it
        if (newRec[field.GIVEN_NAME] === undefined) newRec[field.GIVEN_NAME] = extractedGivenName
        // ditto for surname
        if (newRec[field.FAMILY_NAME] === undefined && extractedFamilyName) newRec[field.FAMILY_NAME] = extractedFamilyName
        
        return newRec
      }
      
      const familyNameFirst = fullName.match(familyNameFirstTest)
      const middleName = `${bitsMatch[2] ? bitsMatch[2] + ' ' : ''}`
      // the 'givenName' is set if there is only one name, which may have multiple parts.
      const givenName = familyNameFirst || !bitsMatch[1]?
        middleName + bitsMatch[3] :
        bitsMatch[1] + middleName
      // so, if familyName is first, but there is only one match, it's already been used by 'givenName' and 'familyName' ends up being the unmatched first group, or ''
      let familyName = familyNameFirst || !bitsMatch[1] ? bitsMatch[1] : bitsMatch[3]
      if (familyName === '') familyName = null
      // 'updateNames' returns the record
      return updateNames(familyName, givenName)
    }
    // else we have no fullname and at least a given name, so we can just return the rec
  }
  
  return rec
}

const normalizeManager = (rec) => {
  if (rec[field.ROLES]?.indexOf('/') === -1 && rec[field.MANAGER]) {
    rec[field.ROLES] = `${rec[field.ROLES]}/${rec[field.MANAGER]}`
    delete rec[field.MANAGER]
  }
  
  return rec
}

const stdDateFmt = /^\s*\d{4}[/.-][01]\d[/.-][0123]\d\s*$/
const indDate = /^\s*(\d{1,2})[/.-]([a-z]+)[/.-](\d{1,4})\s*$/i
const monthTranslator = {
  jan: '01',
  feb: '02',
  mar: '03',
  march: '03',
  apr: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12'
}
const normalizeStartDate = (rec) => {
  const dateS = rec[field.START_DATE]
  if (!dateS || dateS.match(stdDateFmt)) {
    return rec
  }
  
  const match = dateS.match(indDate)
  if (match) {
    const [ , dayS, monthS, yearS ] = match
    rec[field.START_DATE] = `20${yearS}-`
      + monthTranslator[monthS.toLowerCase()] + '-'
      + (dayS.length === 1 ? '0' + dayS : dayS)
  }
  else {
    const guessDate = new Date(rec[field.START_DATE])
    rec[field.START_DATE] = guessDate.getFullYear() + '-'
      + ('' + guessDate.getDate()).padStart(2, '0') + '-'
      + ('' + (guessDate.getMonth() + 1)).padStart(2, '0')
  }
  
  return rec
}

const validateAndNormalizeRecords = (records) => {
  return records.map((rec) => {
    for (const normalizer of [ normalizeNickname, normalizeNames, normalizeManager, normalizeStartDate ]) {
      rec = normalizer(rec)
    }
    return rec
  })
}

/**
* Finalizing the record may have side effects, which should be desribed with an`actionSummary` entry.
*/
const finalizeRecord = (refreshRoles) => ({ actionSummary, newRecord, finalizationCookie, org }) => {
  const { email, title: titleSpec, _sourceFileName } = newRecord
  newRecord.roles = []
  const currRecord = org.staff.get(email, { rawData : true })
  let currRoles = structuredClone(currRecord?.roles) || []
  
  if (currRecord !== undefined)
    newRecord = Object.assign({}, currRecord, newRecord)
  
  const titles = titleSpec?.split(/\s*[;]\s*/) || []
  
  const roleErrors = []
  titles.forEach((title, i) => {
    if (!title) return
    
    const [ roleName, manager ] = title.split('/')
    const [ role, qualifier ] = org.roles.get(roleName, { fuzzy: true, includeQualifier: true })
    if (role === undefined) {
      roleErrors.push(`Could not find role for title '${title}' while processing staff record for '${email}' from '${_sourceFileName}'.`)
      return
    }
    
    // TODO: we could skip the pre-emptive creation once we update later processing to ignore / drop non-truthy 'qualifier' entries
    let roleDef = { name: role.name }
    if (qualifier !== undefined) roleDef.qualifier = qualifier
    if (manager !== undefined) roleDef.manager = manager
    if (currRecord !== undefined) { // it's an update and we need to reconcile changes in the role
      // explicitly note employment status change
      const currEmploymentStatus = currRecord.employmentStatus
      const newEmploymentStatus = newRecord.employmentStatus
      if (currEmploymentStatus !== newEmploymentStatus) {
        actionSummary.push(`Updated ${email} employment status from '${currEmploymentStatus}' to ${newEmploymentStatus}.`)
      }
      // handle roles updates
      const currRoleData = currRoles.find((r) => r.name === roleDef.name)
      if (!currRoleData) {
        // then we are adding a new role
        actionSummary.push(`Added role '${role.name}' to '${email}'.`)
      }
      else {
        roleDef = Object.assign({}, currRoleData, roleDef)
        if (roleDef.manager !== currRoleData.manager) {
          actionSummary.push(`Updated ${email} role '${role.name}' from '${currRoleData.manager}' to '${roleDef.manager}'.`)
        }
        // else no change
      }
    }
    
    newRecord.roles.push(roleDef)
  }) // multi-title forEach loop
  
  if (roleErrors.length > 0) {
    throw new Error(roleErrors.join('\n'))
  }
  // we've now processed the roles from the incoming record, now let's process and reconcile with the existing roles
  
  // now we check if any of the new roles match or 'roll up' existing roles
  if (refreshRoles !== true && refreshRoles !== 'true') {
    for (const newRoleSpec of newRecord.roles) {
      const { name: newRoleName, manager: newRoleManager } = newRoleSpec
      currRoles = currRoles.filter(({ name: currRoleName, manager: currManager }) => {
        if (currRoleName === newRoleName) { // nothing to do
          return false
        }
        else if (org.roles.get(newRoleName).impliesRole(currRoleName)) {
          actionSummary.push(`Dropped ${email} role '${currRoleName}' which is implied by new role '${newRoleName}' on '${email}'.`)
          if (!newRoleManager) { // then infer the manager of the implied role is still the manager
            newRoleSpec.manager = currManager
          }
          return false
        }
        return true
      })
    }
    newRecord.roles.push(...currRoles)
  } // !refreshRoles
  else { // okay, we're refreshing so some roles may be dropped
    for (const currRole of currRecord?.roles || []) {
      if (!newRecord.roles.some((r) => r.name === currRole.name)) {
        actionSummary.push(`Removed ${email} role '${currRole.name}'.`)
      }
    }
  }
  
  for (const newRole of newRecord.roles.map((r) => org.roles.get(r.name, { rawData: true }))) {
    if (newRole.singular) {
      finalizationCookie[email] = newRole.name
    }
  }
  
  // clean up data from import that we don't use here
  delete newRecord.title // captured in roles
  delete newRecord.manager // captured in the roles data
  delete newRecord.fullName // decomposed into given and family names
  delete newRecord['Family name'] // TODO: no idea where this is coming from...
  
  return newRecord
}

const finalizeAllRecords = ({ finalizedRecords, finalizationCookie }) => {
  console.error(`finalizedRecords in finalizeAllRecords: ${JSON.stringify(finalizedRecords, null, '  ')}`) // DEBUG
  // for (const { email, roles } of finalizedRecords) {
  for (const finalizedRecord of structuredClone(finalizedRecords)) {
    console.error(`in iteration: ${finalizedRecord.email} has roles ${JSON.stringify(finalizedRecord.roles)}`) // DEBUG
    const singularRole = finalizationCookie[finalizedRecord.email]
    if (singularRole) {
      for (const { email: testEmail, roles: testRoles } of finalizedRecords) {
        if (finalizedRecord.email === testEmail) continue
        const i = testRoles.findIndex((r) => r.name === singularRole)
        if (i !== -1) {
          console.error(`splicing at ${i}`) // DEBUG
          testRoles.splice(i, 1)
        }
      }
    }
  }
}

/**
* Validates the staff DB is correct after import.
*
* #### Returns
* `true` or an array of human readable screens describing the errors found in the dataset.
*/
const validateAllRecords = ({ org }) => org.staff.validate({ required: true })

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
  finalizeAllRecords,
  finalizeRecord,
  headerNormalizations,
  headerValidations,
  testables,
  validateAllRecords,
  validateAndNormalizeRecords
}
