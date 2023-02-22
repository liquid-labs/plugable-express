import createError from 'http-errors'
import omit from 'lodash.omit'
import { pathToRegexp } from 'path-to-regexp'

import { commonOutputParams } from '@liquid-labs/liq-handlers-lib'
import { sendHelp } from '../handlers/help/lib/send-help'

const helpParameters = commonOutputParams()

const falseParams = /n(o)?|f(alse)?|0/i
const pathParamRegExp = /:[a-zA-Z0-9_]+/g
const regexParamRegExp = /\?<[a-zA-Z0-9_]+>/g
const trueParams = /y(es)?|t(rue)?|1/i

const processBool = (value, name) => {
  if (value.match(trueParams)) {
    return true
  }
  else if (value.match(falseParams)) {
    return false
  }
  else {
    throw new Error(`Could not parse parameter '${name}' value '${value}' as boolean.`)
  }
}

/**
* Combine and verify parameters. Verified parameters collected on `req.vars`
*/
const processParams = ({ parameters = [], path }) => (req, res, next) => {
  const vars = {} // this is where we will collect the combined path, body, and query parameters

  // pull variables out of the path; path vars come in as positional, but in an object, like:
  // { 0: 'path-value' }
  // first, we decode the values
  for (const k in Object.keys(req.params)) { // eslint-disable-line guard-for-in
    vars[k] = decodeURIComponent(req.params[k])
  }
  // Now we map the values to their names by processing the path spec.
  if (Array.isArray(path)) { // expects nested paths to be rolled out, so we're dealing with a flat path spec array
    const mapArr = []
    for (const pathBit of path) {
      if (pathBit.startsWith(':')) {
        const name = pathBit.slice(1)
        mapArr.push(name)
      }
    }

    mapArr.forEach((n, i, arr) => { vars[n] = vars[i] })
  }
  req.vars = vars

  // Now we map the body or query parameters to vars
  const source = req.method === 'POST'
    ? req.body
    : req.query
  if (source === undefined) return true

  // checks for unknown parameters and complain
  const validParams = parameters && parameters.map(p => p.name)
  const remainder = Object.keys(omit(source, validParams))
  if (remainder.length > 0) {
    throw new Error(`Unknown query parameters: ${remainder.join(', ')} while accessing ${req.path}.`)
  }

  // now process flagged variables
  for (const p of parameters) {
    let value = source[p.name]
    if (value === undefined) continue

    if (p.matcher !== undefined && !value.match(p.matcher)) { throw createError.BadRequest(`Parameter ${p.name} value '${value}' does not match ${p.matcher}.`) }

    if (p.isMultivalue === true) {
      // if we have a multivalue but only one instance, it will come in as a single value, we want to convert that to 
      // a single value array
      if (!Array.isArray(value)) {
        value = [ value ]
      }
      value = p.isBoolean === true
        ? value.map((v) => processBool(v, p.name))
        : value.map((v) => decodeURIComponent(v))
    }
    else if (Array.isArray(value)) {
      throw new Error(`Non-multivalue parameter '${p.name}' cannot be specified more than once.`)
    }
    else { // single value var
      value = p.isBoolean === true
        ? processBool(value, p.name)
        : decodeURIComponent(value)
    }

    vars[p.name] = value
  }

  next()
}

const processCommandPath = ({ app, model, pathArr, parameters }) => {
  const commandPath = []
  let reString = '^'
  for (const pathBit of pathArr) {
    if (pathBit.startsWith(':')) {
      const pathVar = pathBit.slice(1)
      const pathUtils = app.liq.pathResolvers[pathVar]
      if (pathUtils === undefined) {
        throw new Error(`Unknown variable path element type '${pathVar}' while processing path ${pathArr.join('/')}.`)
      }
      const { bitReString } = pathUtils
      commandPath.push(pathBit) // with leading ':'
      reString += `/(?<${pathVar}>${bitReString})`
    }
    else if (pathBit.endsWith('?')) {
      const cleanBit = pathBit.slice(0, -1)
      commandPath.push(cleanBit)
      reString += `(?:/${cleanBit})?`
    }
    else {
      commandPath.push(pathBit)
      reString += '/' + pathBit
    }
  }
  reString += '[/#?]?$'
  app.liq.addCommandPath(commandPath, parameters)

  return new RegExp(reString)
}

// express barfs if there are named capture groups in the path RE. However, we really want to use named capture groups
// so we define our paths with them (for future use) and remove them here. The 'slice' removes the leading and trailing
// '/'
const cleanReForExpress = (pathRe) => new RegExp(pathRe.toString().replaceAll(regexParamRegExp, '').slice(1, -1))

const registerHandlers = (app, { sourcePkg, handlers, model, reporter, setupData, cache }) => {
  for (const handler of handlers) {
    const { func, help, method, parameters, path: aPath, paths } = handler
    if ((aPath === undefined && paths === undefined) || method === undefined || func === undefined) {
      throw new Error(`A handler from '${sourcePkg}' does not fully define 'method', 'path', and/or 'func' exports.`)
    }
    if (aPath !== undefined && paths !== undefined) {
      throw new Error(`A handler from '${sourcePkg}' specifies both 'path' and 'paths'; specify one or the other.`)
    }

    const methodUpper = method.toUpperCase()

    // this must come before processCommandPath to give the function the option of registering variable name parameters
    const handlerFunc = func({ parameters, app, cache, model, reporter, setupData })

    for (const path of paths || [aPath]) {
      const routablePath = typeof path === 'string'
        ? path
        : Array.isArray(path)
          ? cleanReForExpress(processCommandPath({ app, model, pathArr : path, parameters }))
          : cleanReForExpress(path) // then it's a regular expression
      reporter.log(`registering handler for path: ${methodUpper}:${routablePath}`)

      app[method](routablePath,
        processParams({ parameters, path }),
        handlerFunc)
      // for or own informational purposes
      const endpointDef = Object.assign({}, handler)

      endpointDef.path = routablePath.toString()

      if (!parameters) {
        reporter.warn(`Endpoint '${method}:${path}' does not define 'parameters'. An explicit '[]' value should be defined where there are no parameters.`)
        endpointDef.parameters = []
      }

      if (!Object.isFrozen(parameters)) { // use parameters as a proxy instead of testing each param seperately
        let i = 0
        // TODO: see regex path note at top
        // Build out any missing path parameters.
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
          Object.freeze(paramDef) // the paramDef is fully specified and shouldn't be changed here on out
        }
      }

      // sort path parameters first
      if (!Object.isFrozen(endpointDef.parameters)) { // This can happen while testing or reloading
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
      }

      // a little cleanup and annotation
      endpointDef.method = methodUpper
      delete endpointDef.func
      endpointDef.sourcePkg = sourcePkg // do this here so it shows up at the end of the obj
      try {
        // endpointDef.matcher = '^\/' + endpointDef.path.replace(pathParamRegExp, '[^/]+') + '[/#?]?$'
        // TODO: see regex path note at top
        endpointDef.matcher = typeof routablePath === 'string'
          ? pathToRegexp(routablePath).toString().slice(1, -2)
          : routablePath.toString().slice(1, -1)
      }
      catch (e) {
        reporter.error(`Exception while attempting to process path '${path}'. Perhaps there are special characters that need escaping; try '([*])' where '*' is your special character. Error message: ${e.message}`)
        throw e
      }

      // lockdown our internal setup
      Object.freeze(endpointDef)
      Object.freeze(parameters)
      app.liq.handlers.push(endpointDef)

      if (help !== undefined) {
        if (!Array.isArray(path)) throw new Error(`Endpoint '${path}' defines help and must use an array style path.`)

        const helpPrefix = [...path]
        helpPrefix.unshift('help')
        // const helpPostfix = [...path]
        // helpPostfix.push('help')

        for (const helpPathTmpl of [helpPrefix]) {
          const helpPath = helpPathTmpl.map((b) => b.startsWith(':') ? b.slice(1) : b)
          const routableHelpPath =
            cleanReForExpress(processCommandPath({ app, model, pathArr : helpPath, parameters : helpParameters }))
          const helpFunc = sendHelp({ help, method, path, parameters }) // from the main endpoint
          app.get(routableHelpPath,
            processParams({ parameters : helpParameters, path : helpPath }),
            helpFunc({ model, reporter }))

          const helpEndpointDef = {
            method     : 'GET',
            parameters : helpParameters,
            path       : routableHelpPath.toString(),
            sourcePkg  : sourcePkg,
            matcher    : routableHelpPath.toString().slice(1, -1)
          }
          Object.freeze(helpEndpointDef)
          app.liq.handlers.push(helpEndpointDef)
        }
      }
    } // for (const path of paths || [ aPath ]) {...}
  } // for (const handler of handlers) {...}
}

export {
  registerHandlers
}
