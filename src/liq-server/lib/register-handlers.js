import asyncHandler from 'express-async-handler'
import omit from 'lodash.omit'
import { pathToRegexp } from 'path-to-regexp'

const falseParams = /n(o)?|f(alse)?|0/i
const pathParamRegExp = /:[a-zA-Z0-9_]+/g
const regexParamRegExp = /\?<[a-zA-Z0-9_]+>/g
const trueParams = /y(es)?|t(rue)?|1/i

const processBool = (value, vars) => {
  if (value.match(trueParams)) {
    return true
  }
  else if (value.match(falseParams)) {
    return false
  }
  else {
    res.status(404).send({ message : `Could not parse parameter '${p.name}' value '${req.query[p.name]}' as boolean.` })
    return false
  }
}

// TODO: this doesn't work and I don't know why...
const processParams = ({ parameters = [], validParams = []}) => (req, res, next) => {
  const source = req.method === 'POST'
    ? req.body
    : req.query
  if (source === undefined) return true
  const vars = Object.assign({}, req.params)
  req.vars = vars
  
  const remainder = Object.keys(omit(source, validParams))
  if (remainder.length > 0) {
    throw new Error(`Unknown query parameters: ${remainder.join(', ')} while accessing ${req.path}.`)
  }
  
  for (const p of parameters) {
    let value = source[p.name]
    if (value === undefined) continue;
    
    if (p.isMultivalue === true) {
      const currList = vars[p.name] || []
      currList.push(...value.split(/\s*,\s*/))
      if (p.isBoolean === true) {
        currList.forEach((v, i) => arr[i] = processBool(v, ))
      }
      value = currList
    }
    else if (p.isBoolean === true) {
      value = processBool(value)
    }
    
    vars[p.name] = value
  }
  
  next()
}

const processCommandPath = (app, pathArr) => {
  const commandPath = []
  let reString = ''
  for (const pathBit of pathArr) {
    if (pathBit.endsWith('?')) {
      const cleanBit = pathBit.slice(0, -1)
      commandPath.push(cleanBit)
      reString += `(/${cleanBit})?`
    }
    else {
      commandPath.push(pathBit)
      reString += '/' + pathBit
    }
  }
  reString += '[/#?]?$'
  app.addCommandPath(commandPath)
  
  return new RegExp(reString)
}

const registerHandlers = (app, { sourcePkg, handlers, model, reporter, setupData, cache }) => {
  for (const handler of handlers) {
    // TODO: make use of 'pathParams' and ensure conformity between the path definition and our defined pathParams
    const { func, help, method, nickName, parameters, path/*, pathParams */ } = handler
    if (path === undefined || method === undefined || func === undefined) {
      throw new Error(`A handler from '${sourcePkg}' does not fully define 'method', 'path', and/or 'func' exports.`)
    }
    /* TODO: see note on regexp paths at top
    if (typeof path !== 'string') {
      throw new Error(`A handler from '${sourcePkg}' for endpoint '${path.toString()}' is not a string. Only string paths are allowed.`)
    } */
    const methodUpper = method.toUpperCase()
    
    const routablePath = Array.isArray(path)
      ? processCommandPath(app, path)
      : typeof path === 'string'
        ? path
        // express barfs if there are named capture groups; but we expect named capture groups so we can identify
        // parameters so we have to remove the bit that names them for express. The 'slice' removes the leading and
        // trailing '/'
        : new RegExp(path.toString().replaceAll(regexParamRegExp, '').slice(1,-1))
    reporter.log(`registering handler for path: ${methodUpper}:${routablePath}`)
    const handlerFunc = func({ parameters, app, cache, model, reporter, setupData })
    const validParams = parameters && parameters.map(p => p.name)
    
    app[method](routablePath,
                processParams({ parameters, validParams }),
                asyncHandler(handlerFunc))
    // for or own informational purposes
    const endpointDef = Object.assign({}, handler)

    endpointDef.path = path.toString()

    if (!parameters) {
      reporter.warn(`Endpoint '${method}:${path}' does not define 'parameters'. An explicit '[]' value should be defined where there are no parameters.`)
      endpointDef.parameters = []
    }
    let i = 0
    // TODO: see regex path note at top
    const pathParams = typeof path === 'string'
      ? path.match(pathParamRegExp)
      : path.toString().match(regexParamRegExp)
    for (const pathParam of pathParams || []) {
      const paramName = pathParam.startsWith(':')
        ? pathParam.substring(1)
        : pathParam.slice(2, -1)
      let paramDef = endpointDef.parameters.find((p) => p.name === paramName)
      if (paramDef === undefined) {
        paramDef = { name : paramName }
        endpointDef.parameters.push(paramDef) // TODO: I assume pushing and sorting more is quicker than unshift and sorting less
      }
      paramDef.required = true
      paramDef.inPath = true
      paramDef.position = i
      paramDef.isSingleValue = true
      i += 1
    }

    for (const paramDef of endpointDef.parameters) {
      if (paramDef.inPath === undefined && paramDef.inQuery === undefined) {
        paramDef.inQuery = true
      }
    }

    endpointDef.parameters.sort((a, b) => {
      if (a.inPath === true && b.inQuery === true) {
        return -1
      }
      else if (b.inPath === true && a.inQuery === true) {
        return 1
      }
      else if (a.inPath) /* sort by position */ return a.position > b.position ? 1 : -1 // position is never equal
      else /* query param; sort by name */ return a.name.localeCompare(b.name)
    })

    // a little cleanup and annotation
    endpointDef.method = methodUpper
    delete endpointDef.func
    endpointDef.sourcePkg = sourcePkg // do this here so it shows up at the end of the obj
    try {
      // endpointDef.matcher = '^\/' + endpointDef.path.replace(pathParamRegExp, '[^/]+') + '[/#?]?$'
      // TODO: see regex path note at top
      endpointDef.matcher = typeof path === 'string'
        ? pathToRegexp(path).toString().slice(1, -2)
        : path.toString().slice(1, -1)
    }
    catch (e) {
      reporter.error(`Exception while attempting to process path '${path}'. Perhaps there are special characters that need escaping; try '([*])' where '*' is your special character. Error message: ${e.message}`)
      throw e
    }

    app.handlers.push(endpointDef)
    if (nickName !== undefined) {
      app.helpData[nickName] = [ help, endpointDef.parameters ]
    }
  }
}

export {
  registerHandlers
}
