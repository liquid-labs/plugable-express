/**
 * Converts a path array to a RegExp for route matching.
 *
 * @param {Array<string>} pathArr - Array of path segments, may include :vars and optional? segments
 * @param {Function} getVarDef - Function to look up variable definitions by name
 * @returns {RegExp} Regular expression for matching the path
 */
const pathToRe = (pathArr, getVarDef) => {
  let reString = '^'

  for (const pathBit of pathArr) {
    if (pathBit.startsWith(':')) {
      const pathVar = pathBit.slice(1)
      const varDef = getVarDef(pathVar)

      if (varDef === undefined) {
        throw new Error(`Unknown variable path element type '${pathVar}' while processing path ${pathArr.join('/')}.`)
      }

      const { validationRe } = varDef
      reString += `/(?<${pathVar}>${validationRe})`
    }
    else if (pathBit.endsWith('?')) {
      const cleanBit = pathBit.slice(0, -1)
      reString += `(?:/${cleanBit})?`
    }
    else {
      reString += '/' + pathBit
    }
  }

  reString += '[/#?]?$'

  return new RegExp(reString)
}

export { pathToRe }
