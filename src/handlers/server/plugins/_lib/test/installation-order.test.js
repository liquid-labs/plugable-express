/* global beforeEach describe expect jest test */

import { determineInstallationOrder } from '../installation-order'

import { DepGraph } from 'dependency-graph'
import { getPackageOrgBasenameAndVersion } from '@liquid-labs/npm-toolkit'
import createError from 'http-errors'
import fs from 'fs/promises'
import yaml from 'yaml'
import path from 'path'

// Mock dependencies
jest.mock('dependency-graph')
jest.mock('@liquid-labs/npm-toolkit')
jest.mock('http-errors')
jest.mock('fs/promises')
jest.mock('yaml')
jest.mock('path')

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

    // Mock path.resolve to return predictable paths
    path.resolve.mockImplementation((...paths) => paths.join('/'))

    // Mock YAML parsing
    yaml.parse.mockImplementation((content) => {
      if (content.includes('dependencies:')) {
        return { dependencies : content.match(/- (.+)/g)?.map(match => match.substring(2)) || [] }
      }
      return {}
    })
  })

  describe('determineInstallationOrder', () => {
    test('returns installation series without dependencies', async() => {
      const toInstall = ['package-a', 'package-b']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'

      getPackageOrgBasenameAndVersion
        .mockResolvedValueOnce({ name : 'package-a' })
        .mockResolvedValueOnce({ name : 'package-b' })

      // Mock fs.readFile to return empty YAML (no dependencies)
      fs.readFile.mockResolvedValue('# No dependencies')

      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(2) // First iteration has 2 packages
        .mockReturnValueOnce(0) // Second iteration has 0 packages (done)
      mockGraph.overallOrder.mockReturnValueOnce(['package-a', 'package-b'])

      const result = await determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })

      expect(result).toEqual([['package-a', 'package-b']])
      expect(mockGraph.addNode).toHaveBeenCalledWith('package-a')
      expect(mockGraph.addNode).toHaveBeenCalledWith('package-b')
    })

    test('handles dependencies correctly', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'

      getPackageOrgBasenameAndVersion
        .mockResolvedValueOnce({ name : 'package-a' })
        .mockResolvedValueOnce({ name : 'dep1' })

      // Mock fs.readFile to return YAML with dependencies for package-a
      fs.readFile
        .mockResolvedValueOnce('dependencies:\n  - dep1') // package-a has dep1
        .mockResolvedValueOnce('# No dependencies') // dep1 has no dependencies

      mockGraph.hasNode
        .mockReturnValueOnce(false) // package-a not in graph
        .mockReturnValueOnce(false) // dep1 not in graph

      mockGraph.size
        .mockReturnValueOnce(2) // First iteration: package-a and dep1
        .mockReturnValueOnce(0) // Done

      mockGraph.overallOrder.mockReturnValueOnce(['dep1', 'package-a'])

      const result = await determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })

      expect(result).toEqual([['dep1', 'package-a']])
      expect(mockGraph.addNode).toHaveBeenCalledWith('package-a')
      expect(mockGraph.addNode).toHaveBeenCalledWith('dep1')
      expect(mockGraph.addDependency).toHaveBeenCalledWith('package-a', 'dep1')
      expect(fs.readFile).toHaveBeenCalledWith('/mock/package/dir/package-a/plugable-express.yaml', 'utf8')
    })

    test('skips dependencies that are already installed', async() => {
      const toInstall = ['package-a']
      const installedPlugins = ['installed-dep']
      const packageDir = '/mock/package/dir'

      getPackageOrgBasenameAndVersion.mockResolvedValue({ name : 'package-a' })

      // Mock fs.readFile to return YAML with dependencies
      fs.readFile.mockResolvedValue('dependencies:\n  - installed-dep')

      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(1) // Only package-a
        .mockReturnValueOnce(0) // Done

      mockGraph.overallOrder.mockReturnValueOnce(['package-a'])

      const result = await determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })

      expect(result).toEqual([['package-a']])
      expect(mockGraph.addNode).toHaveBeenCalledWith('package-a')
      expect(mockGraph.addNode).not.toHaveBeenCalledWith('installed-dep')
      expect(mockGraph.addDependency).not.toHaveBeenCalled()
    })

    test('handles multiple installation series', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'

      getPackageOrgBasenameAndVersion.mockResolvedValue({ name : 'package-a' })
      fs.readFile.mockResolvedValue('# No dependencies')

      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(1) // First series: package-a
        .mockReturnValueOnce(0) // Done

      // Simulate a more complex dependency scenario that would create multiple series
      mockGraph.overallOrder.mockReturnValueOnce(['package-a'])

      const result = await determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })

      expect(result).toEqual([['package-a']])
      expect(mockGraph.removeNode).toHaveBeenCalledWith('package-a')
    })

    test('handles packages without plugable-express.yaml files', async() => {
      const toInstall = ['unknown-package']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'

      getPackageOrgBasenameAndVersion.mockResolvedValue({ name : 'unknown-package' })

      // Mock fs.readFile to throw ENOENT error (file not found)
      const enoentError = new Error('ENOENT: no such file or directory')
      enoentError.code = 'ENOENT'
      fs.readFile.mockRejectedValue(enoentError)

      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(0)

      mockGraph.overallOrder.mockReturnValueOnce(['unknown-package'])

      const result = await determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })

      expect(result).toEqual([['unknown-package']])
      expect(mockGraph.addNode).toHaveBeenCalledWith('unknown-package')
    })

    test('throws on YAML parsing errors', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'

      getPackageOrgBasenameAndVersion.mockResolvedValue({ name : 'package-a' })

      // Mock fs.readFile to return invalid YAML
      fs.readFile.mockResolvedValue('invalid: yaml: content:')
      yaml.parse.mockImplementation(() => {
        throw new Error('Invalid YAML syntax')
      })

      // Mock createError to return a mock error
      createError.mockImplementation((status, originalError, options) => {
        const error = new Error(options.message)
        error.status = status
        error.originalError = originalError
        error.expose = options.expose
        return error
      })

      mockGraph.hasNode.mockReturnValue(false)

      await expect(determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })).rejects.toThrow("Error parsing 'plugable-express.yaml'; possibly invalid yaml. ERR: Invalid YAML syntax")

      expect(createError).toHaveBeenCalledWith(500, expect.any(Error), {
        message : "Error parsing 'plugable-express.yaml'; possibly invalid yaml. ERR: Invalid YAML syntax",
        expose  : true
      })
    })

    test('throws on file access errors', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'

      getPackageOrgBasenameAndVersion.mockResolvedValue({ name : 'package-a' })

      // Mock fs.readFile to throw EACCES error
      const eaccesError = new Error('Permission denied')
      eaccesError.code = 'EACCES'
      fs.readFile.mockRejectedValue(eaccesError)

      // Mock createError to return a mock error
      createError.mockImplementation((status, originalError, options) => {
        const error = new Error(options.message)
        error.status = status
        error.originalError = originalError
        return error
      })

      mockGraph.hasNode.mockReturnValue(false)

      await expect(determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })).rejects.toThrow("Cannot access 'plugable-express.yaml'. ERR: Permission denied")

      expect(createError).toHaveBeenCalledWith(403, eaccesError, {
        message : "Cannot access 'plugable-express.yaml'. ERR: Permission denied"
      })
    })

    test('re-throws unexpected file system errors', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'

      getPackageOrgBasenameAndVersion.mockResolvedValue({ name : 'package-a' })

      // Mock fs.readFile to throw unexpected error
      const unexpectedError = new Error('Disk full')
      unexpectedError.code = 'ENOSPC'
      fs.readFile.mockRejectedValue(unexpectedError)

      mockGraph.hasNode.mockReturnValue(false)

      await expect(determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })).rejects.toThrow('Disk full')
    })

    test('handles complex dependency chains', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'

      getPackageOrgBasenameAndVersion
        .mockResolvedValueOnce({ name : 'package-a' })
        .mockResolvedValueOnce({ name : 'dep1' })
        .mockResolvedValueOnce({ name : 'dep2' })

      // Mock fs.readFile to return complex dependency chain
      fs.readFile
        .mockResolvedValueOnce('dependencies:\n  - dep1') // package-a depends on dep1
        .mockResolvedValueOnce('dependencies:\n  - dep2') // dep1 depends on dep2
        .mockResolvedValueOnce('# No dependencies') // dep2 has no dependencies

      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(3) // package-a, dep1, dep2
        .mockReturnValueOnce(0) // Done

      mockGraph.overallOrder.mockReturnValueOnce(['dep2', 'dep1', 'package-a'])

      const result = await determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })

      expect(result).toEqual([['dep2', 'dep1', 'package-a']])
      expect(mockGraph.addDependency).toHaveBeenCalledWith('package-a', 'dep1')
      expect(mockGraph.addDependency).toHaveBeenCalledWith('dep1', 'dep2')
    })
  })
})
