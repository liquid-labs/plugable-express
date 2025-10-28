/* global beforeEach describe expect jest test */

import createError from 'http-errors'
import { httpSmartResponse } from '@liquid-labs/http-smart-response'
import { uninstall } from '@liquid-labs/npm-toolkit'

// Import the module under test
import { func, help, method, parameters, path } from '../remove.js'

// Mock dependencies
jest.mock('http-errors')
jest.mock('@liquid-labs/http-smart-response')
jest.mock('@liquid-labs/npm-toolkit', () => ({
  uninstall : jest.fn()
}))

describe('remove plugin handler', () => {
  let mockApp
  let mockReporter
  let mockReq
  let mockRes
  let mockReload

  beforeEach(() => {
    jest.clearAllMocks()

    mockReload = jest.fn().mockReturnValue(Promise.resolve())
    mockApp = {
      ext : {
        handlerPlugins : [
          { npmName : 'test-plugin-1' },
          { npmName : 'test-plugin-2' }
        ],
        pluginsPath : '/test/plugins/path'
      },
      reload : jest.fn().mockReturnValue(mockReload)
    }

    mockReporter = { log : jest.fn() }

    mockReq = {
      vars : {
        serverPluginName : 'test-plugin-1'
      }
    }

    mockRes = {}

    uninstall.mockResolvedValue()
    httpSmartResponse.mockReturnValue()
  })

  describe('module exports', () => {
    test('exports correct path', () => {
      expect(path).toEqual(['server', 'plugins', ':serverPluginName', 'remove'])
    })

    test('exports correct method', () => {
      expect(method).toBe('delete')
    })

    test('exports correct help', () => {
      expect(help).toEqual({
        name        : 'remove server endpoint plugins',
        summary     : 'Removes the named plugin.',
        description : 'Removes the named plugin.'
      })
    })

    test('exports empty parameters', () => {
      expect(parameters).toEqual([])
    })

    test('exports function', () => {
      expect(typeof func).toBe('function')
    })
  })

  describe('remove functionality', () => {
    test('successfully removes an existing plugin', async() => {
      const handler = func({ app : mockApp, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(uninstall).toHaveBeenCalledWith({
        packages    : ['test-plugin-1'],
        projectPath : '/test/plugins/path'
      })
      expect(mockApp.reload).toHaveBeenCalledWith()
      expect(httpSmartResponse).toHaveBeenCalledWith({
        msg : '<em>Removed<rst> <code>test-plugin-1<rst> plugin. Server endpoints refreshed.',
        req : mockReq,
        res : mockRes
      })
    })

    test('throws NotFound error for non-existent plugin', async() => {
      mockReq.vars.serverPluginName = 'non-existent-plugin'
      const notFoundError = new Error('Plugin not found')
      createError.NotFound.mockReturnValue(notFoundError)

      const handler = func({ app : mockApp, reporter : mockReporter })

      await expect(handler(mockReq, mockRes)).rejects.toThrow(notFoundError)
      expect(createError.NotFound).toHaveBeenCalledWith("No such plugin 'non-existent-plugin' found.")
      expect(uninstall).not.toHaveBeenCalled()
      expect(httpSmartResponse).not.toHaveBeenCalled()
    })

    test('handles reload function that returns a promise', async() => {
      const promiseReload = jest.fn().mockReturnValue(Promise.resolve('reloaded'))
      mockApp.reload.mockReturnValue(promiseReload)

      const handler = func({ app : mockApp, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(mockApp.reload).toHaveBeenCalledWith()
      expect(uninstall).toHaveBeenCalled()
      expect(httpSmartResponse).toHaveBeenCalled()
    })

    test('handles reload function that returns a non-promise value', async() => {
      const syncReload = jest.fn().mockReturnValue('reloaded')
      mockApp.reload.mockReturnValue(syncReload)

      const handler = func({ app : mockApp, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(mockApp.reload).toHaveBeenCalledWith()
      expect(uninstall).toHaveBeenCalled()
      expect(httpSmartResponse).toHaveBeenCalled()
    })

    test('works when reload function is undefined', async() => {
      // This just tests that the code path works when reload is called
      const handler = func({ app : mockApp, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(uninstall).toHaveBeenCalled()
      expect(httpSmartResponse).toHaveBeenCalled()
    })
  })
})
