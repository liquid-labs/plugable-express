/* global beforeEach describe expect jest test */

import { determineInstallationOrder } from '../installation-order'

import { DepGraph } from 'dependency-graph'
import { getPackageOrgBasenameAndVersion } from '@liquid-labs/npm-toolkit'

// Mock dependencies
jest.mock('dependency-graph')
jest.mock('@liquid-labs/npm-toolkit')

describe('installation-order', () => {
  let mockGraph

  beforeEach(() => {
    jest.clearAllMocks()
    mockGraph = {
      addNode       : jest.fn(),
      hasNode       : jest.fn(),
      addDependency : jest.fn(),
      size          : jest.fn(),
      overallOrder  : jest.fn(),
      removeNode    : jest.fn()
    }
    DepGraph.mockImplementation(() => mockGraph)
  })

  describe('determineInstallationOrder', () => {
    test('returns installation series without dependencies', async() => {
      const pluginSeries = []
      const toInstall = ['package-a', 'package-b']
      const installedPlugins = []

      getPackageOrgBasenameAndVersion
        .mockResolvedValueOnce({ name : 'package-a' })
        .mockResolvedValueOnce({ name : 'package-b' })

      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(2) // First iteration has 2 packages
        .mockReturnValueOnce(0) // Second iteration has 0 packages (done)
      mockGraph.overallOrder.mockReturnValueOnce(['package-a', 'package-b'])

      const result = await determineInstallationOrder({
        installedPlugins,
        pluginSeries,
        toInstall
      })

      expect(result).toEqual([['package-a', 'package-b']])
      expect(mockGraph.addNode).toHaveBeenCalledWith('package-a')
      expect(mockGraph.addNode).toHaveBeenCalledWith('package-b')
    })

    test('handles dependencies correctly', async() => {
      const pluginSeries = [
        {
          plugins : {
            server : [
              { npmName : 'package-a', dependencies : ['dep1'] },
              { npmName : 'dep1', dependencies : [] }
            ]
          }
        }
      ]
      const toInstall = ['package-a']
      const installedPlugins = []

      getPackageOrgBasenameAndVersion.mockResolvedValue({ name : 'package-a' })
      mockGraph.hasNode
        .mockReturnValueOnce(false) // package-a not in graph
        .mockReturnValueOnce(false) // dep1 not in graph

      mockGraph.size
        .mockReturnValueOnce(2) // First iteration: package-a and dep1
        .mockReturnValueOnce(0) // Done

      mockGraph.overallOrder.mockReturnValueOnce(['dep1', 'package-a'])

      const result = await determineInstallationOrder({
        installedPlugins,
        pluginSeries,
        toInstall
      })

      expect(result).toEqual([['dep1', 'package-a']])
      expect(mockGraph.addNode).toHaveBeenCalledWith('package-a')
      expect(mockGraph.addNode).toHaveBeenCalledWith('dep1')
      expect(mockGraph.addDependency).toHaveBeenCalledWith('package-a', 'dep1')
    })

    test('skips dependencies that are already installed', async() => {
      const pluginSeries = [
        {
          plugins : {
            server : [
              { npmName : 'package-a', dependencies : ['installed-dep'] }
            ]
          }
        }
      ]
      const toInstall = ['package-a']
      const installedPlugins = ['installed-dep']

      getPackageOrgBasenameAndVersion.mockResolvedValue({ name : 'package-a' })
      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(1) // Only package-a
        .mockReturnValueOnce(0) // Done

      mockGraph.overallOrder.mockReturnValueOnce(['package-a'])

      const result = await determineInstallationOrder({
        installedPlugins,
        pluginSeries,
        toInstall
      })

      expect(result).toEqual([['package-a']])
      expect(mockGraph.addNode).toHaveBeenCalledWith('package-a')
      expect(mockGraph.addNode).not.toHaveBeenCalledWith('installed-dep')
      expect(mockGraph.addDependency).not.toHaveBeenCalled()
    })

    test('handles multiple installation series', async() => {
      const pluginSeries = []
      const toInstall = ['package-a']
      const installedPlugins = []

      getPackageOrgBasenameAndVersion.mockResolvedValue({ name : 'package-a' })
      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(1) // First series: package-a
        .mockReturnValueOnce(0) // Done

      // Simulate a more complex dependency scenario that would create multiple series
      mockGraph.overallOrder.mockReturnValueOnce(['package-a'])

      const result = await determineInstallationOrder({
        installedPlugins,
        pluginSeries,
        toInstall
      })

      expect(result).toEqual([['package-a']])
      expect(mockGraph.removeNode).toHaveBeenCalledWith('package-a')
    })

    test('handles plugins not found in series', async() => {
      const pluginSeries = []
      const toInstall = ['unknown-package']
      const installedPlugins = []

      getPackageOrgBasenameAndVersion.mockResolvedValue({ name : 'unknown-package' })
      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(0)

      mockGraph.overallOrder.mockReturnValueOnce(['unknown-package'])

      const result = await determineInstallationOrder({
        installedPlugins,
        pluginSeries,
        toInstall
      })

      expect(result).toEqual([['unknown-package']])
      expect(mockGraph.addNode).toHaveBeenCalledWith('unknown-package')
    })
  })
})
