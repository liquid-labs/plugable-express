const commonOutputConfig = (
  { dataFlattener },
  { fields, noHeaders=false }
) => {
  if (fields && typeof fields === 'string') {
    fields = fields.split(/\s*,\s*/)
  }
  
  return {
    dataFlattener,
    fields,
    noHeaders
  }
}

export { commonOutputConfig }
