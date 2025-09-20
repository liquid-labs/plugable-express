/* global beforeEach describe expect jest test */

// Mock dependencies first
import { formatOutput } from '@liquid-labs/liq-handlers-lib'

// Import the module under test
import { func, help, method, parameters, path } from '../list.js'

import { listPlugins } from '../_lib/list-plugins'

jest.mock('@liquid-labs/liq-handlers-lib', () => ({
  commonOutputParams : jest.fn(() => [
    { name : 'fields', optionsFetcher : jest.fn() }
  ]),
  formatOutput : jest.fn()
}))
jest.mock('../_lib/list-plugins')

describe('list plugin handler', () => {
  let mockApp
  let mockReporter
  let mockReq
  let mockRes
  let mockModel

  beforeEach(() => {
    jest.clearAllMocks()

    mockApp = {
      ext : {
        handlerPlugins : [
          { npmName : 'test-plugin-1', handlerCount : 5, summary : 'Test plugin 1' },
          { npmName : 'test-plugin-2', handlerCount : 3, summary : 'Test plugin 2' }
        ]
      }
    }

    mockModel = {}
    mockReporter = { log : jest.fn() }

    mockReq = {
      vars : {}
    }

    mockRes = {}

    // Mock the formatOutput function
    formatOutput.mockImplementation(() => {})

    // Mock listPlugins
    listPlugins.mockReturnValue(mockApp.ext.handlerPlugins)
  })

  describe('module exports', () => {
    test('exports correct path', () => {
      expect(path).toEqual(['server', 'plugins', 'list'])
    })

    test('exports correct method', () => {
      expect(method).toBe('get')
    })

    test('exports correct help', () => {
      expect(help).toEqual({
        name        : 'server endpoint plugins list',
        summary     : 'Lists the installed server endpoint plugins.',
        description : 'Lists the installed server endpoint plugins.'
      })
    })

    test('exports parameters without available and update flags', () => {
      const baseParams = parameters.filter(p => p.name === 'available' || p.name === 'update')
      expect(baseParams).toEqual([])
    })

    test('exports function', () => {
      expect(typeof func).toBe('function')
    })
  })

  describe('list functionality', () => {
    test('lists installed plugins', async() => {
      const handler = func({ app : mockApp, model : mockModel, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(listPlugins).toHaveBeenCalledWith({ app : mockApp })
      expect(formatOutput).toHaveBeenCalledWith(expect.objectContaining({
        basicTitle : 'Plugins Report',
        data       : expect.arrayContaining([
          expect.objectContaining({ npmName : 'test-plugin-1', installed : true }),
          expect.objectContaining({ npmName : 'test-plugin-2', installed : true })
        ]),
        defaultFields : ['npmName', 'handlerCount', 'installed', 'summary', 'homepage'],
        reporter      : mockReporter,
        req           : mockReq,
        res           : mockRes
      }))
    })

    test('sorts installed plugins alphabetically', async() => {
      const unsortedPlugins = [
        { npmName : 'zebra-plugin', handlerCount : 1 },
        { npmName : 'alpha-plugin', handlerCount : 2 }
      ]
      listPlugins.mockReturnValue(unsortedPlugins)

      const handler = func({ app : mockApp, model : mockModel, reporter : mockReporter })

      await handler(mockReq, mockRes)

      const formatOutputCall = formatOutput.mock.calls[0][0]
      expect(formatOutputCall.data[0].npmName).toBe('alpha-plugin')
      expect(formatOutputCall.data[1].npmName).toBe('zebra-plugin')
    })

    test('handles empty installed plugins list', async() => {
      listPlugins.mockReturnValue([])

      const handler = func({ app : mockApp, model : mockModel, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(formatOutput).toHaveBeenCalledWith(expect.objectContaining({
        data : []
      }))
    })

    test('handles null installed plugins', async() => {
      listPlugins.mockReturnValue(null)

      const handler = func({ app : mockApp, model : mockModel, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(formatOutput).toHaveBeenCalledWith(expect.objectContaining({
        data : []
      }))
    })

    test('adds installed flag to each plugin', async() => {
      const handler = func({ app : mockApp, model : mockModel, reporter : mockReporter })

      await handler(mockReq, mockRes)

      const formatOutputCall = formatOutput.mock.calls[0][0]
      expect(formatOutputCall.data.every(p => p.installed === true)).toBe(true)
    })

    test('passes all formatters to formatOutput', async() => {
      const handler = func({ app : mockApp, model : mockModel, reporter : mockReporter })

      await handler(mockReq, mockRes)

      const formatOutputCall = formatOutput.mock.calls[0][0]
      expect(typeof formatOutputCall.mdFormatter).toBe('function')
      expect(typeof formatOutputCall.terminalFormatter).toBe('function')
      expect(typeof formatOutputCall.textFormatter).toBe('function')
    })
  })
})
