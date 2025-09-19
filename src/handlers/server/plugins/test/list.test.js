/* global beforeEach describe expect jest test */

// Mock dependencies first
import createError from 'http-errors'
import { formatOutput } from '@liquid-labs/liq-handlers-lib'

// Import the module under test
import { func, help, method, parameters, path } from '../list.js'

import { listPlugins } from '../_lib/list-plugins'
import { determineRegistryData } from '../_lib/registry-utils'
import { selectMatchingPlugins } from '../_lib/plugin-selection'

jest.mock('http-errors')
jest.mock('@liquid-labs/liq-handlers-lib', () => ({
  commonOutputParams : jest.fn(() => [
    { name : 'fields', optionsFetcher : jest.fn() }
  ]),
  formatOutput : jest.fn()
}))
jest.mock('../_lib/list-plugins')
jest.mock('../_lib/registry-utils')
jest.mock('../_lib/plugin-selection')

describe('list plugin handler', () => {
  let mockApp
  let mockReporter
  let mockReq
  let mockRes
  let mockCache
  let mockModel

  beforeEach(() => {
    jest.clearAllMocks()

    mockApp = {
      ext : {
        handlerPlugins : [
          { npmName : 'test-plugin-1', handlerCount : 5, summary : 'Test plugin 1' },
          { npmName : 'test-plugin-2', handlerCount : 3, summary : 'Test plugin 2' }
        ],
        serverVersion  : '1.0.0',
        noRegistries   : false,
        serverSettings : {
          registries : ['http://example.com/registry.json']
        }
      }
    }

    mockCache = {}
    mockModel = {}
    mockReporter = { log : jest.fn() }

    mockReq = {
      vars : {
        available : false,
        update    : false
      }
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

    test('exports parameters including available and update flags', () => {
      const baseParams = parameters.filter(p => p.name === 'available' || p.name === 'update')
      expect(baseParams).toEqual([
        {
          name        : 'available',
          isBoolean   : true,
          description : 'Lists available plugins from registries rather than installed plugins.'
        },
        {
          name        : 'update',
          isBoolean   : true,
          description : 'Forces an update even if registry data is already cached.'
        }
      ])
    })

    test('exports function', () => {
      expect(typeof func).toBe('function')
    })
  })

  describe('list functionality', () => {
    test('lists installed plugins by default', async() => {
      const handler = func({ app : mockApp, cache : mockCache, model : mockModel, reporter : mockReporter })

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

      const handler = func({ app : mockApp, cache : mockCache, model : mockModel, reporter : mockReporter })

      await handler(mockReq, mockRes)

      const formatOutputCall = formatOutput.mock.calls[0][0]
      expect(formatOutputCall.data[0].npmName).toBe('alpha-plugin')
      expect(formatOutputCall.data[1].npmName).toBe('zebra-plugin')
    })

    test('lists available plugins when available flag is true', async() => {
      mockReq.vars.available = true
      const availablePlugins = [
        { npmName : 'available-plugin-1', summary : 'Available plugin 1', provider : 'registry1' },
        { npmName : 'available-plugin-2', summary : 'Available plugin 2' }
      ]

      determineRegistryData.mockResolvedValue({ registry1 : { /* registry data */ } })
      selectMatchingPlugins.mockReturnValue(availablePlugins)

      const handler = func({ app : mockApp, cache : mockCache, model : mockModel, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(determineRegistryData).toHaveBeenCalledWith({
        cache      : mockCache,
        registries : ['http://example.com/registry.json'],
        reporter   : mockReporter,
        update     : false
      })

      expect(selectMatchingPlugins).toHaveBeenCalledWith({
        hostVersion      : '1.0.0',
        installedPlugins : mockApp.ext.handlerPlugins,
        pluginType       : 'server',
        registryData     : { registry1 : { /* registry data */ } }
      })

      expect(formatOutput).toHaveBeenCalledWith(expect.objectContaining({
        data          : availablePlugins,
        defaultFields : ['npmName', 'summary', 'homepage']
      }))
    })

    test('throws error when available flag is used with noRegistries', async() => {
      mockReq.vars.available = true
      mockApp.ext.noRegistries = true
      createError.BadRequest.mockReturnValue(new Error('No registries'))

      const handler = func({ app : mockApp, cache : mockCache, model : mockModel, reporter : mockReporter })

      await expect(handler(mockReq, mockRes)).rejects.toThrow('No registries')
      expect(createError.BadRequest).toHaveBeenCalledWith(
        "This server does not use registries; the 'available' parameter cannot be used."
      )
    })

    test('forces registry update when update flag is true', async() => {
      mockReq.vars.available = true
      mockReq.vars.update = true

      determineRegistryData.mockResolvedValue({})
      selectMatchingPlugins.mockReturnValue([])

      const handler = func({ app : mockApp, cache : mockCache, model : mockModel, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(determineRegistryData).toHaveBeenCalledWith(expect.objectContaining({
        update : true
      }))
    })

    test('handles empty installed plugins list', async() => {
      listPlugins.mockReturnValue([])

      const handler = func({ app : mockApp, cache : mockCache, model : mockModel, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(formatOutput).toHaveBeenCalledWith(expect.objectContaining({
        data : []
      }))
    })

    test('handles null installed plugins', async() => {
      listPlugins.mockReturnValue(null)

      const handler = func({ app : mockApp, cache : mockCache, model : mockModel, reporter : mockReporter })

      await handler(mockReq, mockRes)

      expect(formatOutput).toHaveBeenCalledWith(expect.objectContaining({
        data : []
      }))
    })

    test('adds installed flag to each plugin', async() => {
      const handler = func({ app : mockApp, cache : mockCache, model : mockModel, reporter : mockReporter })

      await handler(mockReq, mockRes)

      const formatOutputCall = formatOutput.mock.calls[0][0]
      expect(formatOutputCall.data.every(p => p.installed === true)).toBe(true)
    })

    test('passes all formatters to formatOutput', async() => {
      const handler = func({ app : mockApp, cache : mockCache, model : mockModel, reporter : mockReporter })

      await handler(mockReq, mockRes)

      const formatOutputCall = formatOutput.mock.calls[0][0]
      expect(typeof formatOutputCall.mdFormatter).toBe('function')
      expect(typeof formatOutputCall.terminalFormatter).toBe('function')
      expect(typeof formatOutputCall.textFormatter).toBe('function')
    })
  })
})
