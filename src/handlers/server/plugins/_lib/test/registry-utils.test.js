/* global afterEach beforeEach describe expect jest test */

import { determineRegistryData, REGISTRY_DATA_KEY } from '../registry-utils'

import * as fs from 'node:fs/promises'
import createError from 'http-errors'
import yaml from 'js-yaml'

// Mock dependencies
jest.mock('node:fs/promises')
jest.mock('http-errors')
jest.mock('js-yaml')

describe('registry-utils', () => {
  let mockCache
  let mockReporter

  beforeEach(() => {
    mockCache = {
      get : jest.fn(),
      put : jest.fn()
    }
    mockReporter = {
      log : jest.fn()
    }
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    delete global.fetch
  })

  describe('determineRegistryData', () => {
    test('returns cached data when available and update is false', async() => {
      const cachedData = { testRegistry : { meta : { id : 'test' } } }
      mockCache.get.mockReturnValue(cachedData)

      const result = await determineRegistryData({
        cache      : mockCache,
        registries : ['http://example.com/registry.json'],
        reporter   : mockReporter
      })

      expect(mockCache.get).toHaveBeenCalledWith(REGISTRY_DATA_KEY)
      expect(result).toBe(cachedData)
      expect(mockReporter.log).toHaveBeenCalledWith('Loading registries data from cache...')
    })

    test('loads data from HTTP registries when cache is empty', async() => {
      mockCache.get.mockReturnValue(undefined)
      const registryData = { meta : { id : 'test-registry' } }
      global.fetch.mockResolvedValue({
        text : jest.fn().mockResolvedValue(JSON.stringify(registryData))
      })

      const result = await determineRegistryData({
        cache      : mockCache,
        registries : ['http://example.com/registry.json'],
        reporter   : mockReporter
      })

      expect(global.fetch).toHaveBeenCalledWith('http://example.com/registry.json')
      expect(mockCache.put).toHaveBeenCalledWith(REGISTRY_DATA_KEY, { 'test-registry' : registryData })
      expect(result).toEqual({ 'test-registry' : registryData })
    })

    test('loads data from file:// registries', async() => {
      mockCache.get.mockReturnValue(undefined)
      const registryData = { meta : { id : 'file-registry' } }
      fs.readFile.mockResolvedValue(JSON.stringify(registryData))

      const result = await determineRegistryData({
        cache      : mockCache,
        registries : ['file:///path/to/registry.json'],
        reporter   : mockReporter
      })

      expect(fs.readFile).toHaveBeenCalledWith('///path/to/registry.json')
      expect(result).toEqual({ 'file-registry' : registryData })
    })

    test('parses YAML registries', async() => {
      mockCache.get.mockReturnValue(undefined)
      const registryData = { meta : { id : 'yaml-registry' } }
      const yamlContent = 'meta:\\n  id: yaml-registry'
      global.fetch.mockResolvedValue({
        text : jest.fn().mockResolvedValue(yamlContent)
      })
      yaml.load.mockReturnValue(registryData)

      const result = await determineRegistryData({
        cache      : mockCache,
        registries : ['http://example.com/registry.yaml'],
        reporter   : mockReporter
      })

      expect(yaml.load).toHaveBeenCalledWith(yamlContent)
      expect(result).toEqual({ 'yaml-registry' : registryData })
    })

    test('throws error for registry without meta.id', async() => {
      mockCache.get.mockReturnValue(undefined)
      const registryData = { someField : 'value' }
      global.fetch.mockResolvedValue({
        text : jest.fn().mockResolvedValue(JSON.stringify(registryData))
      })
      createError.BadRequest.mockReturnValue(new Error('Missing meta.id'))

      await expect(determineRegistryData({
        cache      : mockCache,
        registries : ['http://example.com/registry.json'],
        reporter   : mockReporter
      })).rejects.toThrow('Missing meta.id')
    })

    test('throws error for network failures', async() => {
      mockCache.get.mockReturnValue(undefined)
      const networkError = new Error('Network error')
      global.fetch.mockRejectedValue(networkError)
      createError.InternalServerError.mockReturnValue(new Error('Could not load registry data'))

      await expect(determineRegistryData({
        cache      : mockCache,
        registries : ['http://example.com/registry.json'],
        reporter   : mockReporter
      })).rejects.toThrow('Could not load registry data')
    })

    test('forces update when update flag is true', async() => {
      const cachedData = { oldRegistry : { meta : { id : 'old' } } }
      mockCache.get.mockReturnValue(cachedData)
      const newRegistryData = { meta : { id : 'new-registry' } }
      global.fetch.mockResolvedValue({
        text : jest.fn().mockResolvedValue(JSON.stringify(newRegistryData))
      })

      const result = await determineRegistryData({
        cache      : mockCache,
        registries : ['http://example.com/registry.json'],
        reporter   : mockReporter,
        update     : true
      })

      expect(global.fetch).toHaveBeenCalled()
      expect(result).toEqual({ 'new-registry' : newRegistryData })
    })
  })
})
