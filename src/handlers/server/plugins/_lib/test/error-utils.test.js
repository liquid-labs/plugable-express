/* global describe expect test */

import { PluginError } from '../error-utils'

describe('PluginError utility', () => {
  describe('invalidInput', () => {
    test('creates a 400 error with proper structure', () => {
      const error = PluginError.invalidInput('Test invalid input message', { extra : 'data' })

      expect(error.status).toBe(400)
      expect(error.expose).toBe(true)
      expect(error.type).toBe('INVALID_INPUT')
      expect(error.message).toBe('Test invalid input message')
      expect(error.extra).toBe('data')
    })

    test('works without details parameter', () => {
      const error = PluginError.invalidInput('Simple message')

      expect(error.status).toBe(400)
      expect(error.expose).toBe(true)
      expect(error.type).toBe('INVALID_INPUT')
      expect(error.message).toBe('Simple message')
    })
  })

  describe('validation', () => {
    test('creates a validation error with proper structure', () => {
      const error = PluginError.validation('field name', 'invalid value', 'expected format', { packageName : 'test' })

      expect(error.status).toBe(400)
      expect(error.expose).toBe(true)
      expect(error.type).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Invalid field name: invalid value. Expected: expected format')
      expect(error.field).toBe('field name')
      expect(error.value).toBe('invalid value')
      expect(error.expected).toBe('expected format')
      expect(error.packageName).toBe('test')
    })

    test('works without additional details', () => {
      const error = PluginError.validation('username', 'abc', 'at least 5 characters')

      expect(error.field).toBe('username')
      expect(error.value).toBe('abc')
      expect(error.expected).toBe('at least 5 characters')
    })
  })

  describe('access', () => {
    test('creates a 403 error with proper structure', () => {
      const originalError = new Error('Permission denied')
      const error = PluginError.access('Cannot access file', originalError)

      expect(error.status).toBe(403)
      expect(error.expose).toBe(false)
      expect(error.type).toBe('ACCESS_ERROR')
      expect(error.message).toBe('Cannot access file')
    })

    test('works without original error', () => {
      const error = PluginError.access('Access denied')

      expect(error.status).toBe(403)
      expect(error.expose).toBe(false)
      expect(error.type).toBe('ACCESS_ERROR')
    })
  })

  describe('parsing', () => {
    test('creates a parsing error with details exposed', () => {
      const originalError = new Error('YAML syntax error')
      const error = PluginError.parsing('/path/to/file.yaml', originalError, true)

      expect(error.status).toBe(400)
      expect(error.expose).toBe(true)
      expect(error.type).toBe('PARSING_ERROR')
      expect(error.message).toBe("Error parsing file '/path/to/file.yaml': YAML syntax error")
      expect(error.filePath).toBe('/path/to/file.yaml')
    })

    test('creates a parsing error with details hidden', () => {
      const originalError = new Error('Internal parsing error')
      const error = PluginError.parsing('/path/to/file.yaml', originalError, false)

      expect(error.status).toBe(400)
      expect(error.expose).toBe(false)
      expect(error.message).toBe("Error parsing file '/path/to/file.yaml': parsing failed")
      expect(error.filePath).toBe('/path/to/file.yaml')
    })
  })

  describe('dependency', () => {
    test('creates a dependency error with cycle information', () => {
      const cycle = ['package-a', 'package-b', 'package-a']
      const error = PluginError.dependency('Circular dependency detected', cycle, 'package-a')

      expect(error.status).toBe(400)
      expect(error.expose).toBe(true)
      expect(error.type).toBe('DEPENDENCY_ERROR')
      expect(error.message).toBe('Circular dependency detected')
      expect(error.cycle).toEqual(cycle)
      expect(error.packageName).toBe('package-a')
    })

    test('works without cycle or package name', () => {
      const error = PluginError.dependency('General dependency error')

      expect(error.status).toBe(400)
      expect(error.type).toBe('DEPENDENCY_ERROR')
      expect(error.cycle).toBeNull()
      expect(error.packageName).toBeNull()
    })
  })

  describe('resourceLimit', () => {
    test('creates a resource limit error with proper structure', () => {
      const error = PluginError.resourceLimit('Package count', 600, 500, { hint : 'Too many packages' })

      expect(error.status).toBe(400)
      expect(error.expose).toBe(true)
      expect(error.type).toBe('RESOURCE_LIMIT_ERROR')
      expect(error.message).toBe('Package count limit exceeded: 600 > 500')
      expect(error.limitType).toBe('Package count')
      expect(error.current).toBe(600)
      expect(error.maximum).toBe(500)
      expect(error.hint).toBe('Too many packages')
    })

    test('works without additional details', () => {
      const error = PluginError.resourceLimit('Memory usage', 1024, 512)

      expect(error.limitType).toBe('Memory usage')
      expect(error.current).toBe(1024)
      expect(error.maximum).toBe(512)
    })
  })

  describe('internal', () => {
    test('creates an internal error with details exposed', () => {
      const originalError = new Error('Database connection failed')
      const error = PluginError.internal('Internal server error', originalError, true)

      expect(error.status).toBe(500)
      expect(error.expose).toBe(true)
      expect(error.type).toBe('INTERNAL_ERROR')
      expect(error.message).toBe('Internal server error')
    })

    test('creates an internal error with details hidden', () => {
      const originalError = new Error('Sensitive error details')
      const error = PluginError.internal('Something went wrong', originalError, false)

      expect(error.status).toBe(500)
      expect(error.expose).toBe(false)
      expect(error.type).toBe('INTERNAL_ERROR')
    })

    test('works without original error', () => {
      const error = PluginError.internal('Generic internal error')

      expect(error.status).toBe(500)
      expect(error.expose).toBe(false)
      expect(error.type).toBe('INTERNAL_ERROR')
    })
  })

  describe('error consistency', () => {
    test('all error types have consistent structure', () => {
      const errors = [
        PluginError.invalidInput('test'),
        PluginError.validation('field', 'value', 'expected'),
        PluginError.access('test'),
        PluginError.parsing('file.yaml', new Error('test')),
        PluginError.dependency('test'),
        PluginError.resourceLimit('test', 10, 5),
        PluginError.internal('test')
      ]

      errors.forEach(error => {
        expect(error).toHaveProperty('status')
        expect(error).toHaveProperty('expose')
        expect(error).toHaveProperty('type')
        expect(error).toHaveProperty('message')
        expect(typeof error.status).toBe('number')
        expect(typeof error.expose).toBe('boolean')
        expect(typeof error.type).toBe('string')
        expect(typeof error.message).toBe('string')
      })
    })

    test('all 400 errors have expose: true (except parsing with exposeDetails=false)', () => {
      const clientErrors = [
        PluginError.invalidInput('test'),
        PluginError.validation('field', 'value', 'expected'),
        PluginError.parsing('file.yaml', new Error('test'), true), // exposeDetails: true
        PluginError.dependency('test'),
        PluginError.resourceLimit('test', 10, 5)
      ]

      clientErrors.forEach(error => {
        expect(error.status).toBe(400)
        expect(error.expose).toBe(true)
      })

      // Special case: parsing with exposeDetails=false should have expose=false
      const hiddenParsingError = PluginError.parsing('file.yaml', new Error('test'), false)
      expect(hiddenParsingError.status).toBe(400)
      expect(hiddenParsingError.expose).toBe(false)
    })

    test('403 errors have expose: false for security', () => {
      const accessError = PluginError.access('test')
      expect(accessError.status).toBe(403)
      expect(accessError.expose).toBe(false)
    })

    test('500 errors respect exposeMessage parameter', () => {
      const exposedError = PluginError.internal('test', null, true)
      const hiddenError = PluginError.internal('test', null, false)

      expect(exposedError.status).toBe(500)
      expect(exposedError.expose).toBe(true)
      expect(hiddenError.status).toBe(500)
      expect(hiddenError.expose).toBe(false)
    })
  })
})
