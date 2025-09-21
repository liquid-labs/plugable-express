/* global beforeEach describe expect jest test */

import { determineInstallationOrder } from '../installation-order'

import { DepGraph } from 'dependency-graph'
import createError from 'http-errors'
import fs from 'fs/promises'
import yaml from 'yaml'
import path from 'path'

// Mock dependencies
jest.mock('dependency-graph')
jest.mock('@liquid-labs/npm-toolkit', () => ({
  getPackageOrgBasenameAndVersion: jest.requireActual('@liquid-labs/npm-toolkit').getPackageOrgBasenameAndVersion
}))
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
        const dependencies = []

        // Split by lines and process dependencies
        const lines = content.split('\n')
        let i = 0

        while (i < lines.length) {
          const line = lines[i].trim()

          if (line.startsWith('- ')) {
            const depStr = line.substring(2).trim()

            // Check if this is an object dependency (multi-line)
            if (depStr.includes('npmPackage:')) {
              const npmPackage = depStr.split('npmPackage:')[1].trim()
              let version

              // Check next line for version
              if (i + 1 < lines.length && lines[i + 1].trim().includes('version:')) {
                version = lines[i + 1].split('version:')[1].trim().replace(/"/g, '')
                i++ // Skip the version line
              }

              dependencies.push({
                npmPackage,
                version
              })
            }
            else if (depStr && !depStr.includes(':')) {
              // Simple string dependency
              dependencies.push(depStr)
            }
            else if (depStr.includes('invalidObject:')) {
              // Test case for invalid format
              dependencies.push({ invalidObject : true })
            }
          }
          i++
        }

        return { dependencies }
      }
      return {}
    })
  })

  describe('determineInstallationOrder', () => {
    test('returns installation series without dependencies', async() => {
      const toInstall = ['package-a', 'package-b']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'


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
      const installedPlugins = [{ npmName : 'installed-dep' }]
      const packageDir = '/mock/package/dir'


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

    test('handles object format dependencies with version specs', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'


      // Mock fs.readFile to return object format dependencies
      fs.readFile
        .mockResolvedValueOnce('dependencies:\n  - npmPackage: dep1\n    version: "^1.0.0"')
        .mockResolvedValueOnce('# No dependencies') // dep1 has no dependencies

      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(2) // package-a and dep1@^1.0.0
        .mockReturnValueOnce(0) // Done

      mockGraph.overallOrder.mockReturnValueOnce(['dep1@^1.0.0', 'package-a'])

      const result = await determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })

      expect(result).toEqual([['dep1@^1.0.0', 'package-a']])
      expect(mockGraph.addNode).toHaveBeenCalledWith('package-a')
      expect(mockGraph.addNode).toHaveBeenCalledWith('dep1@^1.0.0')
      expect(mockGraph.addDependency).toHaveBeenCalledWith('package-a', 'dep1@^1.0.0')
    })

    test('handles mixed string and object format dependencies', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'

      // Mock fs.readFile with mixed dependency formats
      fs.readFile
        .mockResolvedValueOnce('dependencies:\n  - dep1\n  - npmPackage: dep2\n    version: "~2.0.0"')
        .mockResolvedValueOnce('# No dependencies') // dep1 has no dependencies
        .mockResolvedValueOnce('# No dependencies') // dep2 has no dependencies

      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(3) // package-a, dep1, dep2@~2.0.0
        .mockReturnValueOnce(0) // Done

      mockGraph.overallOrder.mockReturnValueOnce(['dep1', 'dep2@~2.0.0', 'package-a'])

      const result = await determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })

      expect(result).toEqual([['dep1', 'dep2@~2.0.0', 'package-a']])
      expect(mockGraph.addDependency).toHaveBeenCalledWith('package-a', 'dep1')
      expect(mockGraph.addDependency).toHaveBeenCalledWith('package-a', 'dep2@~2.0.0')
    })

    test('handles object format dependencies without version specs', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'


      // Mock fs.readFile to return object format without version
      fs.readFile
        .mockResolvedValueOnce('dependencies:\n  - npmPackage: dep1')
        .mockResolvedValueOnce('# No dependencies') // dep1 has no dependencies

      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(2) // package-a and dep1
        .mockReturnValueOnce(0) // Done

      mockGraph.overallOrder.mockReturnValueOnce(['dep1', 'package-a'])

      const result = await determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })

      expect(result).toEqual([['dep1', 'package-a']])
      expect(mockGraph.addDependency).toHaveBeenCalledWith('package-a', 'dep1')
    })

    test('throws error for invalid dependency format', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'


      // Mock fs.readFile to return invalid dependency format
      fs.readFile.mockResolvedValueOnce('dependencies:\n  - invalidObject: true')

      mockGraph.hasNode.mockReturnValue(false)

      await expect(determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })).rejects.toThrow('Error parsing \'plugable-express.yaml\'; possibly invalid yaml. ERR: Invalid dependency format: {"invalidObject":true}')
    })

    test('skips dependency processing when noImplicitInstallation is true', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'
      const noImplicitInstallation = true

      // Mock fs.readFile to return dependencies (but they should be ignored)
      fs.readFile.mockResolvedValue('dependencies:\n  - dep1\n  - dep2')

      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(1) // Only package-a
        .mockReturnValueOnce(0) // Done

      mockGraph.overallOrder.mockReturnValueOnce(['package-a'])

      const result = await determineInstallationOrder({
        installedPlugins,
        noImplicitInstallation,
        packageDir,
        toInstall
      })

      expect(result).toEqual([['package-a']])
      expect(mockGraph.addNode).toHaveBeenCalledWith('package-a')
      expect(mockGraph.addNode).toHaveBeenCalledTimes(1) // Only the main package, no dependencies
      expect(mockGraph.addDependency).not.toHaveBeenCalled() // No dependencies added
      expect(fs.readFile).not.toHaveBeenCalled() // No dependency files read
    })

    test('processes dependencies normally when noImplicitInstallation is false', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'
      const noImplicitInstallation = false

      // Mock fs.readFile to return dependencies
      fs.readFile
        .mockResolvedValueOnce('dependencies:\n  - dep1') // package-a has dep1
        .mockResolvedValueOnce('# No dependencies') // dep1 has no dependencies

      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(2) // package-a and dep1
        .mockReturnValueOnce(0) // Done

      mockGraph.overallOrder.mockReturnValueOnce(['dep1', 'package-a'])

      const result = await determineInstallationOrder({
        installedPlugins,
        noImplicitInstallation,
        packageDir,
        toInstall
      })

      expect(result).toEqual([['dep1', 'package-a']])
      expect(mockGraph.addNode).toHaveBeenCalledWith('package-a')
      expect(mockGraph.addNode).toHaveBeenCalledWith('dep1')
      expect(mockGraph.addDependency).toHaveBeenCalledWith('package-a', 'dep1')
      expect(fs.readFile).toHaveBeenCalledWith('/mock/package/dir/package-a/plugable-express.yaml', 'utf8')
    })

    test('processes dependencies normally when noImplicitInstallation is undefined', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'
      // noImplicitInstallation is undefined (falsy)

      // Mock fs.readFile to return dependencies
      fs.readFile
        .mockResolvedValueOnce('dependencies:\n  - dep1') // package-a has dep1
        .mockResolvedValueOnce('# No dependencies') // dep1 has no dependencies

      mockGraph.hasNode.mockReturnValue(false)
      mockGraph.size
        .mockReturnValueOnce(2) // package-a and dep1
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
    })
  })
})
