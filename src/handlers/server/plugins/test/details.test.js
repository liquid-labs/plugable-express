/* global beforeEach describe expect jest test */

import createError from 'http-errors'
import { httpSmartResponse } from '@liquid-labs/http-smart-response'

// Import the module under test
import { func, help, method, parameters, path } from '../details.js'

// Mock dependencies
jest.mock('http-errors')
jest.mock('@liquid-labs/http-smart-response')

describe('details plugin handler', () => {
  let mockApp
  let mockReporter
  let mockReq
  let mockRes

  beforeEach(() => {
    jest.clearAllMocks()

    mockApp = {
      ext : {
        handlerPlugins : [
          {
            npmName      : 'test-plugin-1',
            handlerCount : 5,
            summary      : 'Test plugin 1',
            homepage     : 'https://example.com/plugin1',
            version      : '1.0.0'
          },
          {
            npmName      : 'test-plugin-2',
            handlerCount : 3,
            summary      : 'Test plugin 2',
            homepage     : 'https://example.com/plugin2',
            version      : '2.1.0'
          }
        ]
      }
    }

    mockReporter = { log : jest.fn() }

    mockReq = {
      vars : {
        serverPluginName : 'test-plugin-1'
      }
    }

    mockRes = {}

    // Mock httpSmartResponse
    httpSmartResponse.mockImplementation(() => {})
  })

  describe('module exports', () => {
    test('exports correct path', () => {
      expect(path).toEqual(['server', 'plugins', ':serverPluginName', 'details'])
    })

    test('exports correct method', () => {
      expect(method).toBe('get')
    })

    test('exports correct help', () => {
      expect(help).toEqual({
        name        : 'server endpoint plugins details',
        summary     : 'Provides details on the named plugin.',
        description : 'Provides details on the named plugin.'
      })
    })

    test('exports empty parameters', () => {
      expect(parameters).toEqual([])
    })

    test('exports function', () => {
      expect(typeof func).toBe('function')
    })
  })

  describe('details functionality', () => {
    test('returns details for existing plugin', async() => {
      const handler = func({ app : mockApp, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(httpSmartResponse).toHaveBeenCalledWith({
        data : mockApp.ext.handlerPlugins[0],
        req  : mockReq,
        res  : mockRes
      })
    })

    test('finds plugin by exact name match', async() => {
      mockReq.vars.serverPluginName = 'test-plugin-2'
      const handler = func({ app : mockApp, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(httpSmartResponse).toHaveBeenCalledWith({
        data : mockApp.ext.handlerPlugins[1],
        req  : mockReq,
        res  : mockRes
      })
    })

    test('throws NotFound error for non-existent plugin', async() => {
      mockReq.vars.serverPluginName = 'non-existent-plugin'
      createError.NotFound.mockReturnValue(new Error('Plugin not found'))

      const handler = func({ app : mockApp, reporter : mockReporter })

      await expect(handler(mockReq, mockRes)).rejects.toThrow('Plugin not found')
      expect(createError.NotFound).toHaveBeenCalledWith(
        "No such plugin 'non-existent-plugin' found."
      )
    })

    test('handles empty plugin list', async() => {
      mockApp.ext.handlerPlugins = []
      createError.NotFound.mockReturnValue(new Error('Plugin not found'))

      const handler = func({ app : mockApp, reporter : mockReporter })

      await expect(handler(mockReq, mockRes)).rejects.toThrow('Plugin not found')
      expect(createError.NotFound).toHaveBeenCalledWith(
        "No such plugin 'test-plugin-1' found."
      )
    })

    test('handles null plugin list', async() => {
      mockApp.ext.handlerPlugins = null
      createError.NotFound.mockReturnValue(new Error('Plugin not found'))

      const handler = func({ app : mockApp, reporter : mockReporter })

      await expect(handler(mockReq, mockRes)).rejects.toThrow('Plugin not found')
    })

    test('handles undefined plugin list', async() => {
      mockApp.ext.handlerPlugins = undefined
      createError.NotFound.mockReturnValue(new Error('Plugin not found'))

      const handler = func({ app : mockApp, reporter : mockReporter })

      await expect(handler(mockReq, mockRes)).rejects.toThrow('Plugin not found')
    })

    test('returns all plugin properties in response', async() => {
      const handler = func({ app : mockApp, reporter : mockReporter })

      await handler(mockReq, mockRes)

      const expectedData = mockApp.ext.handlerPlugins[0]
      expect(httpSmartResponse).toHaveBeenCalledWith({
        data : expect.objectContaining({
          npmName      : expectedData.npmName,
          handlerCount : expectedData.handlerCount,
          summary      : expectedData.summary,
          homepage     : expectedData.homepage,
          version      : expectedData.version
        }),
        req : mockReq,
        res : mockRes
      })
    })

    test('handles plugin with minimal properties', async() => {
      mockApp.ext.handlerPlugins = [
        { npmName : 'minimal-plugin' }
      ]
      mockReq.vars.serverPluginName = 'minimal-plugin'

      const handler = func({ app : mockApp, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(httpSmartResponse).toHaveBeenCalledWith({
        data : { npmName : 'minimal-plugin' },
        req  : mockReq,
        res  : mockRes
      })
    })
  })
})
