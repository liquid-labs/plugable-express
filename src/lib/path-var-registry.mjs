/**
 * Registry for path variable definitions.
 * Path vars are used in handler paths (e.g., :serverPluginName) and need validation patterns.
 *
 * varDef structure:
 * {
 *   validationRe: string - Regular expression pattern to match the variable value
 *   optionsFetcher: function - Optional function that returns available options for this var
 * }
 */

// Module-level registry
let registry = {}

/**
 * Clears the entire registry. Called at the start of appInit.
 */
const clearRegistry = () => {
  registry = {}
}

/**
 * Registers a path variable definition.
 * @param {string} varName - Name of the variable (without leading colon)
 * @param {Object} varDef - Definition object with { validationRe, optionsFetcher }
 * @throws {Error} If varName is already registered
 */
const registerPathVar = (varName, varDef) => {
  if (registry[varName] !== undefined) {
    throw new Error(`Path variable '${varName}' is already registered.`)
  }

  registry[varName] = varDef
}

/**
 * Retrieves a path variable definition.
 * @param {string} varName - Name of the variable (without leading colon)
 * @returns {Object|undefined} The varDef object, or undefined if not found
 */
const getVarDef = (varName) => {
  return registry[varName]
}

export { clearRegistry, registerPathVar, getVarDef }
