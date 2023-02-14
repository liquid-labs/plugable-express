import { getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

const method = 'put'
const path = ['orgs', ':orgKey', 'parameters', ':parameterKey', 'set']
const parameters = [
  {
    name        : 'asBoolean',
    isBoolean   : true,
    description : "When set `true`, the `value` parameter value is interpretted as a boolean value. Ignoring case, the strings 'true', 'yes', and any string of digits other than '0' are treated as true; 'false', 'no', and '0' are treated as false. All other inputs will raise a 400 BAD REQUEST status. See `asInteger`, `asJSON`, and `asNumber`."
  },
  {
    name        : 'asInteger',
    isBoolean   : true,
    description : 'When set `true`, the `value` parameter value is interpretted as an integer. See also `asBoolean`, `asJSON`, and `asNumber`.'
  },
  {
    name        : 'asJSON',
    isBoolean   : true,
    description : 'When set `true`, the `value` parameter value is interpretted as a JSON string. See also `asBoolean`, `asInteger`, asNumber`, and `asJSON`.'
  },
  {
    name        : 'asNumber',
    isBoolean   : true,
    description : 'When set `true`, the `value` parameter value is interpretted as a number. See also `asBoolean`, `asInteger`, and `asJSON`.'
  },
  {
    name        : 'setNull',
    isBoolean   : true,
    description : 'If true, then the parameter will be set to literal `null`. `value` and all other value transform settings will be ignored except `setUndefined` which takes precedence.'
  },
  {
    name        : 'setUndefined',
    isBoolean   : true,
    description : 'If true, then the parameter will be set to literal `undefined`. `setUndefined` take precedence over all other value setting flags;`value` and all other value transform settings will be ignored.'
  },
  {
    name        : 'value',
    description : 'The value to set the parameter to. This parameter is required unless `setNull` or `setUndefined` are present and true. By default, this will be treated as a string. Use the `asBoolean`, `asInteger`, asNumber`, and `asJSON` flags to change the interpretation of the value string.'
  }
]

const parseBool = (value) => {
  value = value.toLowerCase()

  if (value === 'false' || value === 'no' || value === '0') return false
  else if (value === 'true' || value === 'yes' || value.match(/^\d+/)) return true

  throw new Error(`Could not parse value '${value}' as boolean. Try 'true' or 'false'.`)
}

const func = ({ app, model, reporter }) => {
  /* Already set in parameters-detail... we really need to approach this a different way
  app.liq.pathResolvers['parameterKey'] = {
    optionsFetcher: ({ orgKey }) => {
      const org = model.orgs[orgKey]
      const parameters = listParameters(org)
      return parameters.map((p) => p.name)
    },
    bitReString: '(?:[.][_a-zA-Z][_a-zA-Z0-9-]*)+'
  } */

  return (req, res) => {
    const org = getOrgFromKey({ model, params : req.vars, res })
    if (org === false) return

    const { asBoolean, asInteger, asJSON, asNumber, parameterKey, setNull, setUndefined, value } = req.vars
    const parsedValue = setUndefined === true
      ? undefined
      : setNull
        ? null
        : asBoolean === true
          ? parseBool(value)
          : asInteger === true
            ? parseInt(value)
            : asJSON === true
              ? JSON.parse(value)
              : asNumber === true
                ? Number.parseFloat(value)
                : value // it's a string!

    org.updateSetting(parameterKey, parsedValue)
    org.save()

    const accepts = ['text/terminal', 'text/plain', 'application/json']
    const responseType = req.accepts(accepts)
    if (responseType === false) {
      res.status(406).send(`Cannot provide response for '${req.get('content-type')}'; response can be provided in the following formats: ` + accepts.join(', '))
      return
    }
    // else, let's respond!

    res.type(responseType)

    switch (responseType) {
    case 'text/terminal':
      res.send(`Parameter <code>${parameterKey}<rst> set to '<em>${value}<rst>'.`); break
    case 'text/plain':
      res.send(`Parameter ${parameterKey} set to '${value}.`); break
    case 'application/json':
      res.send({ name : parameterKey, value })
    }
  }
}

export { func, parameters, path, method }
