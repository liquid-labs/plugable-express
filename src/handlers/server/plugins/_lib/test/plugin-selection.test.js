/* global beforeEach describe expect jest test */

import { selectMatchingSeries, selectMatchingPlugins } from '../plugin-selection'
import * as semver from 'semver'

// Mock semver
// jest.mock('semver')

describe('plugin-selection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('selectMatchingSeries', () => {
    test('returns matching series based on host version', () => {
      const registryData = {
        registry1 : {
          series : [
            { versions : '>=1.0.0', name : 'series1' },
            { versions : '>=2.0.0', name : 'series2' }
          ]
        },
        registry2 : {
          series : [
            { versions : '<=1.5.0', name : 'series3' }
          ]
        }
      }

      const result = selectMatchingSeries({
        hostVersion : '1.0.0',
        registryData
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ versions : '>=1.0.0', name : 'series1', source : 'registry1' })
      expect(result[1]).toEqual({ versions : '<=1.5.0', name : 'series3', source : 'registry2' })
    })

    test('returns empty array when no series match', () => {
      const registryData = {
        registry1 : {
          series : [
            { versions : '>=2.0.0', name : 'series1' }
          ]
        }
      }

      const result = selectMatchingSeries({
        hostVersion : '1.0.0',
        registryData
      })

      expect(result).toHaveLength(0)
    })

    test('handles empty registry data', () => {
      const result = selectMatchingSeries({
        hostVersion  : '1.0.0',
        registryData : {}
      })

      expect(result).toHaveLength(0)
    })
  })

  describe('selectMatchingPlugins', () => {
    test('returns matching plugins with installation status', () => {
      const registryData = {
        registry1 : {
          series : [
            {
              versions : '>=1.0.0',
              plugins  : {
                server : [
                  { npmName : 'plugin-a', version : '1.0.0' },
                  { npmName : 'plugin-b', version : '1.1.0' }
                ]
              }
            }
          ]
        }
      }

      const installedPlugins = [
        { npmName : 'plugin-a', version : '1.0.0' }
      ]

      const result = selectMatchingPlugins({
        hostVersion : '1.0.0',
        installedPlugins,
        pluginType  : 'server',
        registryData
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        npmName   : 'plugin-a',
        version   : '1.0.0',
        installed : true,
        source    : 'registry1'
      })
      expect(result[1]).toEqual({
        npmName   : 'plugin-b',
        version   : '1.1.0',
        installed : false,
        source    : 'registry1'
      })
    })

    test('handles missing plugin type', () => {
      const registryData = {
        registry1 : {
          series : [
            {
              versions : '>=1.0.0',
              plugins  : {
                client : [
                  { npmName : 'client-plugin', version : '1.0.0' }
                ]
              }
            }
          ]
        }
      }

      const result = selectMatchingPlugins({
        hostVersion : '1.0.0',
        pluginType  : 'server',
        registryData
      })

      expect(result).toHaveLength(0)
    })

    test('works without installedPlugins parameter', () => {
      const registryData = {
        registry1 : {
          series : [
            {
              versions : '>=1.0.0',
              plugins  : {
                server : [
                  { npmName : 'plugin-a', version : '1.0.0' }
                ]
              }
            }
          ]
        }
      }

      const result = selectMatchingPlugins({
        hostVersion : '1.0.0',
        pluginType  : 'server',
        registryData
      })

      expect(result).toHaveLength(1)
      expect(result[0].installed).toBeUndefined()
    })
  })
})
