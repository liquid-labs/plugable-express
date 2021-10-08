import * as field from './staff-import-fields'

// validation data and functions
const headerMatchers = [
  [ /company/i, field.COMPANY ],
  [ /full *name/i, field.FULL_NAME ],
  [ /(given|first) *name/i, field.GIVEN_NAME ],
  [ /(surname|last *name)/i, field.SURNAME ],
  [ /nickname/i, field.NICKNAME ],
  [ /title/i, field.TITLE ],
  [ /start date/i, field.START_DATE ],
  [ /end *date/i, field.END_DATE ]
]

const headerValidations = [
  // note, fast-csv/parse will check for duplicate headers, so we don't have too
  // Keeping the field.TITLE and field.START_DATE checks separets allows us to report both if both fail.
  (newHeaders) => newHeaders.indexOf(field.TITLE) > -1 ? null : `Missing '${field.TITLE}' column.`,
  (newHeaders) => newHeaders.indexOf(field.START_DATE) > -1 ? null : `Missing '${field.START_DATE}' column.`,
  (newHeaders) =>
    newHeaders.indexOf(field.GIVEN_NAME) > -1
      ? null // we have a given name, good
      : newHeaders.indexOf(field.FULL_NAME) > -1
        ? null // we have no given name, but we'll try and extract it, so good for now
        : `You must provide either '${field.SURNAME}', or '${field.FULL_NAME}'. If you want to include both given names and surnames, '${field.GIVEN_NAME}' + '${field.SURNAME}' is prefered over '${field.FULL_NAME}' preferred.`,
]

const validateAndNormalizeHeaders = (origHeaders) => {
  const newHeaders = []
  
  for (const origHeader of origHeaders) {
    const match = headerMatchers.find(([ re ], i) => origHeader.match(re))
    newHeaders.push(match ? match[1] : origHeader)
  }
  
  const errorMessages = headerValidations.filter((v) => v(newHeaders))
  
  if (errorMessages.length === 0) {
    return newHeaders
  }
  else {
    const errorMessage = errorMessages.length === 1
      ? errorMessages[0]
      : `* ${errorMessages.join("\n* ")}`
    
    throw new Error(errorMessage)
  }
}

// record normalization functions

// Note, this RE relies on the field value being having been trimmed.
const nicknameExtractor = /"([^"]+)"|"([^"]+)"/

// If nickname is not explicitly defined already, then checks the full name
//
// Note: this must be run before 'normalizeNames'
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

// If given name and surname are not defined, then extracts them from full name
//
// Note: this must be run after 'normalizeNickname'
const normalizeNames = (rec) => {
  if (!rec[field.GIVEN_NAME] || !rec[field.SURNAME]) {
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
        if (rec[field.SURNAME] && rec[field.SURNAME] !== extractedSurname)
          throw new Error(`Extracted surname '${extractedGivenName}' from full name '${fullName}' but it does not match specified surname '${rec[field.GIVEN_NAME]}'`)
          
        // now, for the updates!
        // If no specified given name, but we have an extracted given name, use it
        if (newRec[field.GIVEN_NAME] === undefined) newRec[field.GIVEN_NAME] = extractedGivenName
        // ditto for surname
        if (rec[field.SURNAME] === undefined && extractedSurname) newRec[field.SURNAME] = extractedSurname
        
        return newRec
      }
      
      return fullName.match(lastNameFirst)
        ? updateNames(bitsMatch[1], bitsMatch[3])
        : updateNames(bitsMatch[3], bitsMatch[1])
    }
    // else we have no fullname and at least a given name, so we can just return
  }
  
  return rec
}

const normalizeAllNames = (rec) => {
  rec = normalizeNickname(rec)
  return normalizeNames(rec)
}

export {
  field, // re-export from here to maintain clear field names for both this file and subsequent consumers
  normalizeAllNames,
  normalizeNames,
  normalizeNickname,
  validateAndNormalizeHeaders
}
