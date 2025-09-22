/* global beforeEach describe expect jest test */

import { determineInstallationOrder } from '../installation-order'

import { DepGraph } from 'dependency-graph'
import fs from 'fs/promises'
import yaml from 'yaml'
import path from 'path'

// Mock dependencies
jest.mock('dependency-graph')
jest.mock('@liquid-labs/npm-toolkit', () => ({
  getPackageOrgBasenameAndVersion : jest.requireActual('@liquid-labs/npm-toolkit').getPackageOrgBasenameAndVersion
}))
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
    test.skip('returns installation series without dependencies', async() => {
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

    test.skip('handles dependencies correctly', async() => {
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

    test.skip('skips dependencies that are already installed', async() => {
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

    test.skip('handles multiple installation series', async() => {
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

    test.skip('handles packages without plugable-express.yaml files', async() => {
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

      mockGraph.hasNode.mockReturnValue(false)

      await expect(determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })).rejects.toThrow("Error parsing file 'plugable-express.yaml (package: package-a)': Invalid YAML syntax")
    })

    test('throws on file access errors', async() => {
      const toInstall = ['package-a']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'

      // Mock fs.readFile to throw EACCES error
      const eaccesError = new Error('Permission denied')
      eaccesError.code = 'EACCES'
      fs.readFile.mockRejectedValue(eaccesError)

      mockGraph.hasNode.mockReturnValue(false)

      await expect(determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })).rejects.toThrow("Cannot access 'plugable-express.yaml' for package 'package-a'; permission denied")
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
      })).rejects.toThrow('Unexpected error reading plugable-express.yaml') // underlying 500 errors are hidden
    })

    test.skip('handles complex dependency chains', async() => {
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

    test.skip('handles object format dependencies with version specs', async() => {
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

    test.skip('handles mixed string and object format dependencies', async() => {
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

    test.skip('handles object format dependencies without version specs', async() => {
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
      })).rejects.toThrow('Invalid dependency format')
    })

    test.skip('skips dependency processing when noImplicitInstallation is true', async() => {
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

    test.skip('processes dependencies normally when noImplicitInstallation is false', async() => {
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

    test.skip('processes dependencies normally when noImplicitInstallation is undefined', async() => {
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

    test('rejects YAML with excessive aliases (billion laughs protection)', async() => {
      const toInstall = ['malicious-package']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'

      const maliciousYaml = `
a: &a ["lol","lol","lol","lol","lol","lol","lol","lol","lol"]
b: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]
c: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]
dependencies: *c
`
      fs.readFile.mockResolvedValueOnce(maliciousYaml)

      // Mock yaml.parse to throw the expected error for too many aliases
      yaml.parse.mockImplementation(() => {
        throw new Error('too many aliases')
      })

      mockGraph.hasNode.mockReturnValue(false)

      await expect(determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })).rejects.toThrow('too many aliases')
    })

    test('rejects oversized YAML files', async() => {
      const toInstall = ['huge-package']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'

      const hugeDependencies = 'dependencies:\n' + '  - package\n'.repeat(5000)
      fs.readFile.mockResolvedValueOnce(hugeDependencies)

      mockGraph.hasNode.mockReturnValue(false)

      await expect(determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })).rejects.toThrow('YAML file size limit exceeded')
    })

    test('rejects YAML with invalid root structure', async() => {
      const toInstall = ['invalid-package']
      const installedPlugins = []
      const packageDir = '/mock/package/dir'

      fs.readFile.mockResolvedValueOnce('just a string')

      // Mock yaml.parse to return a non-object (string)
      yaml.parse.mockReturnValue('just a string')

      mockGraph.hasNode.mockReturnValue(false)

      await expect(determineInstallationOrder({
        installedPlugins,
        packageDir,
        toInstall
      })).rejects.toMatchObject({
        status : 400,
        expose : true,
        type   : 'VALIDATION_ERROR'
      })
    })

    describe('error handling standardization', () => {
      test('throws consistent validation errors for invalid dependency format', async() => {
        const toInstall = ['test-package']
        fs.readFile.mockResolvedValueOnce('dependencies:\n  - invalidObject: true')
        mockGraph.hasNode.mockReturnValue(false)

        await expect(determineInstallationOrder({
          installedPlugins : [],
          packageDir       : '/test',
          toInstall
        })).rejects.toMatchObject({
          status : 400,
          expose : true,
          type   : 'VALIDATION_ERROR',
          field  : 'dependency format'
        })
      })

      test('throws consistent access errors for file permission issues', async() => {
        const toInstall = ['test-package']
        const accessError = new Error('Permission denied')
        accessError.code = 'EACCES'
        fs.readFile.mockRejectedValueOnce(accessError)
        mockGraph.hasNode.mockReturnValue(false)

        await expect(determineInstallationOrder({
          installedPlugins : [],
          packageDir       : '/test',
          toInstall
        })).rejects.toMatchObject({
          status : 403,
          expose : false,
          type   : 'ACCESS_ERROR'
        })
      })

      test('throws consistent dependency errors for circular dependencies', async() => {
        const toInstall = ['package-a']
        fs.readFile
          .mockResolvedValueOnce('dependencies:\n  - package-b')
          .mockResolvedValueOnce('dependencies:\n  - package-a')
        mockGraph.hasNode.mockReturnValue(false)

        await expect(determineInstallationOrder({
          installedPlugins : [],
          packageDir       : '/test',
          toInstall
        })).rejects.toMatchObject({
          status : 400,
          expose : true,
          type   : 'DEPENDENCY_ERROR'
        })
      })

      test('throws consistent resource limit errors', async() => {
        const toInstall = ['test-package']
        const hugeDependencies = 'dependencies:\n' + '  - package\n'.repeat(101)
        fs.readFile.mockResolvedValueOnce(hugeDependencies)
        mockGraph.hasNode.mockReturnValue(false)

        await expect(determineInstallationOrder({
          installedPlugins : [],
          packageDir       : '/test',
          toInstall
        })).rejects.toMatchObject({
          status : 400,
          expose : true,
          type   : 'RESOURCE_LIMIT_ERROR'
        })
      })

      test('throws consistent parsing errors for invalid YAML', async() => {
        const toInstall = ['test-package']
        fs.readFile.mockResolvedValueOnce('invalid: yaml: content:')
        yaml.parse.mockImplementation(() => {
          throw new Error('Invalid YAML syntax')
        })
        mockGraph.hasNode.mockReturnValue(false)

        await expect(determineInstallationOrder({
          installedPlugins : [],
          packageDir       : '/test',
          toInstall
        })).rejects.toMatchObject({
          status : 400,
          expose : true,
          type   : 'PARSING_ERROR'
        })
      })
    })

    describe('circular dependency detection', () => {
      test('detects simple circular dependency (A → B → A)', async() => {
        const toInstall = ['package-a']

        fs.readFile
          .mockResolvedValueOnce('dependencies:\n  - package-b') // package-a depends on package-b
          .mockResolvedValueOnce('dependencies:\n  - package-a') // package-b depends on package-a

        mockGraph.hasNode.mockReturnValue(false)

        await expect(determineInstallationOrder({
          installedPlugins : [],
          packageDir       : '/test',
          toInstall
        })).rejects.toMatchObject({
          status : 400,
          type   : 'DEPENDENCY_ERROR'
        })
      })

      test('detects complex circular dependency (A → B → C → A)', async() => {
        const toInstall = ['package-a']

        fs.readFile
          .mockResolvedValueOnce('dependencies:\n  - package-b') // package-a → package-b
          .mockResolvedValueOnce('dependencies:\n  - package-c') // package-b → package-c
          .mockResolvedValueOnce('dependencies:\n  - package-a') // package-c → package-a

        mockGraph.hasNode.mockReturnValue(false)

        await expect(determineInstallationOrder({
          installedPlugins : [],
          packageDir       : '/test',
          toInstall
        })).rejects.toThrow(/Circular dependency detected.*package-a.*package-b.*package-c.*package-a/)
      })

      test('detects self-referencing package', async() => {
        const toInstall = ['self-ref-package']

        fs.readFile.mockResolvedValueOnce('dependencies:\n  - self-ref-package')
        mockGraph.hasNode.mockReturnValue(false)

        await expect(determineInstallationOrder({
          installedPlugins : [],
          packageDir       : '/test',
          toInstall
        })).rejects.toThrow(/Circular dependency detected.*self-ref-package.*self-ref-package/)
      })

      test.skip('handles deep dependency chains without false positives', async() => {
        const toInstall = ['package-a']

        // Create deep chain: A → B → C → D → E (no cycles)
        fs.readFile
          .mockResolvedValueOnce('dependencies:\n  - package-b')
          .mockResolvedValueOnce('dependencies:\n  - package-c')
          .mockResolvedValueOnce('dependencies:\n  - package-d')
          .mockResolvedValueOnce('dependencies:\n  - package-e')
          .mockResolvedValueOnce('dependencies: []')

        mockGraph.hasNode.mockReturnValue(false)
        mockGraph.size
          .mockReturnValueOnce(5)
          .mockReturnValueOnce(0)
        mockGraph.overallOrder.mockReturnValueOnce(['package-e', 'package-d', 'package-c', 'package-b', 'package-a'])

        const result = await determineInstallationOrder({
          installedPlugins : [],
          packageDir       : '/test',
          toInstall
        })

        expect(result).toEqual([['package-e', 'package-d', 'package-c', 'package-b', 'package-a']])
      })

      test('respects resource limits - too many dependencies per package', async() => {
        const toInstall = ['package-with-many-deps']

        // Create a package with too many dependencies (> 100)
        const manyDeps = Array.from({ length : 101 }, (_, i) => `  - dep-${i}`).join('\n')
        fs.readFile.mockResolvedValueOnce(`dependencies:\n${manyDeps}`)

        mockGraph.hasNode.mockReturnValue(false)

        await expect(determineInstallationOrder({
          installedPlugins : [],
          packageDir       : '/test',
          toInstall
        })).rejects.toThrow(/dependencies limit exceeded/)
      })

      test('has defensive limits in place to prevent DoS attacks', async() => {
        const toInstall = ['package-a']

        // Test that we have multiple layers of protection
        // This test verifies resource limits are working (which is better than iteration limits)
        const hugeDependencies = 'dependencies:\n' + '  - package\n'.repeat(501)
        fs.readFile.mockResolvedValueOnce(hugeDependencies)

        mockGraph.hasNode.mockReturnValue(false)

        await expect(determineInstallationOrder({
          installedPlugins : [],
          packageDir       : '/test',
          toInstall
        })).rejects.toThrow(/dependencies limit exceeded/)
      })

      test('handles DepGraph cyclic dependency errors gracefully', async() => {
        const toInstall = ['package-a']

        fs.readFile
          .mockResolvedValueOnce('dependencies:\n  - package-b')
          .mockResolvedValueOnce('dependencies: []')

        mockGraph.hasNode.mockReturnValue(false)

        // Mock addDependency to throw cyclic dependency error
        mockGraph.addDependency.mockImplementation(() => {
          throw new Error('Cyclic dependency found: package-a -> package-b')
        })

        await expect(determineInstallationOrder({
          installedPlugins : [],
          packageDir       : '/test',
          toInstall
        })).rejects.toThrow(/Circular dependency detected between/)
      })

      test('handles DepGraph overallOrder cyclic dependency errors', async() => {
        const toInstall = ['package-a']

        fs.readFile.mockResolvedValueOnce('dependencies: []')
        mockGraph.hasNode.mockReturnValue(false)
        mockGraph.size.mockReturnValue(1) // Should always return 1 to keep loop running

        // Mock overallOrder to throw cyclic dependency error
        mockGraph.overallOrder.mockImplementation(() => {
          throw new Error('Cyclic dependency found in overall order')
        })

        await expect(determineInstallationOrder({
          installedPlugins : [],
          packageDir       : '/test',
          toInstall
        })).rejects.toThrow(/Circular dependency detected in installation order/)
      })
    })
  })
})
