import createError from 'http-errors'

/**
 * Standardized error creation utilities for the plugin system
 *
 * Error Types:
 * - INVALID_INPUT (400): User provided invalid input
 * - VALIDATION_ERROR (400): Specific field validation failed
 * - ACCESS_ERROR (403): Permission/access issues
 * - PARSING_ERROR (400): File parsing failures
 * - DEPENDENCY_ERROR (400): Circular or invalid dependencies
 * - RESOURCE_LIMIT_ERROR (400): DoS prevention limits hit
 * - INTERNAL_ERROR (500): Unexpected server issues
 *
 * All errors include:
 * - Consistent HTTP status codes
 * - Proper exposure settings for security
 * - Structured error details for API consumers
 * - Type field for programmatic handling
 */

export const PluginError = {
  /**
   * Creates a client error (400) for invalid user input
   */
  invalidInput: (message, details = {}) => {
    return createError(400, {
      message,
      expose: true,
      type: 'INVALID_INPUT',
      ...details
    })
  },

  /**
   * Creates a validation error for specific field validation failures
   */
  validation: (field, value, expected, details = {}) => {
    return createError(400, {
      message: `Invalid ${field}: ${value}. Expected: ${expected}`,
      expose: true,
      type: 'VALIDATION_ERROR',
      field,
      value,
      expected,
      ...details
    })
  },

  /**
   * Creates an access error (403) for permission issues
   */
  access: (message, originalError = null) => {
    return createError(403, originalError, {
      message,
      expose: false,
      type: 'ACCESS_ERROR'
    })
  },

  /**
   * Creates a parsing error (400) for YAML/JSON parsing issues
   */
  parsing: (filePath, originalError, exposeDetails = true) => {
    return createError(400, originalError, {
      message: `Error parsing file '${filePath}': ${exposeDetails ? originalError.message : 'parsing failed'}`,
      expose: exposeDetails,
      type: 'PARSING_ERROR',
      filePath
    })
  },

  /**
   * Creates a dependency error (400) for circular/invalid dependencies
   */
  dependency: (message, cycle = null, packageName = null) => {
    return createError(400, {
      message,
      expose: true,
      type: 'DEPENDENCY_ERROR',
      cycle,
      packageName
    })
  },

  /**
   * Creates a resource limit error (400) for DoS prevention
   */
  resourceLimit: (limitType, current, maximum, details = {}) => {
    return createError(400, {
      message: `${limitType} limit exceeded: ${current} > ${maximum}`,
      expose: true,
      type: 'RESOURCE_LIMIT_ERROR',
      limitType,
      current,
      maximum,
      ...details
    })
  },

  /**
   * Creates a server error (500) for unexpected internal issues
   */
  internal: (message, originalError = null, exposeMessage = false) => {
    return createError(500, originalError, {
      message,
      expose: exposeMessage,
      type: 'INTERNAL_ERROR'
    })
  }
}