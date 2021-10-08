import * as field from './staff-import-fields'

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
    newHeaders.indexOf(field.GIVEN_NAME) > -1 && newHeaders.indexOf(field.SURNAME) > -1
      ? null
      : newHeaders.indexOf(field.FULL_NAME) > -1
        ? null
        : `You must provide eithher '${field.GIVEN_NAME}' and '${field.SURNAME}' columns, or '${field.FULL_NAME}'. '${field.GIVEN_NAME}' + '${field.SURNAME}' are preferred.`,
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

export {
  field, // re-export from here to maintain clear field names for both this file and subsequent consumers
  validateAndNormalizeHeaders
}
