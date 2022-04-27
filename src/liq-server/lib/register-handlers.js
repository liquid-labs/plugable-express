import { pathToRegexp } from 'path-to-regexp'

const falseParams = /n(o)?|f(alse)?|0/i
const pathParamRegExp = /:[a-zA-Z0-9_]+/g
const regexParamRegExp = /\?<[a-zA-Z0-9_]+>/g
const trueParams = /y(es)?|t(rue)?|1/i

const createHandler = ({ parameters, func, ...rest }) => {
  const handlerFunc = func({ ...rest })
  if (parameters?.length > 0) {
    return (req, res) => {
      paramNormalizer({ parameters, req, res })
      handlerFunc(req, res)
    }
  }
  else {
    return handlerFunc
  }
}

const paramNormalizer = ({ parameters, req, res }) => {
  for (const p of parameters.filter(p => p.isBoolean)) {
    if (req.query[p.name] !== undefined) {
      if (req.query[p.name].match(trueParams)) {
        req.query[p.name] = true
      }
      else if (req.query[p.name].match(falseParams)) {
        req.query[p.name] = false
      }
      else {
        res.status(404).send({ message : `Could not parse parameter '${p.name}' value '${req.query[p.name]}' as boolean.` })
        return false
      }
    }
  }
  return true
}

const registerHandlers = (app, { sourcePkg, handlers, model, reporter, setupData, cache }) => {
  for (const handler of handlers) {
    // TODO: make use of 'pathParams' and ensure conformity between the path definition and our defined pathParams
    const { func, method, parameters, path/*, pathParams */ } = handler
    if (path === undefined || method === undefined || func === undefined) {
      throw new Error(`A handler from '${sourcePkg}' does not fully define 'method', 'path', and/or 'func' exports.`)
    }
    /* TODO: see note on regexp paths at top
    if (typeof path !== 'string') {
      throw new Error(`A handler from '${sourcePkg}' for endpoint '${path.toString()}' is not a string. Only string paths are allowed.`)
    } */
    const methodUpper = method.toUpperCase()
    reporter.log(`registering handler for path: ${methodUpper}:${path.toString()}`)
    // so express can find the handler
    // app[method](path, createHandler({ parameters, func, app, cache, model, reporter, setupData }))
    app[method](path, createHandler({ parameters, func, app, cache, model, reporter, setupData }))
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
      const paramName = pathParam.substring(1)
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
        return 1
      }
      else if (b.inPath === true && a.inQuery === true) {
        return -1
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
  }
}

export {
  registerHandlers
}
