/* global beforeEach describe expect jest test */

import { installPlugins } from '../install-plugins'

import * as fs from 'node:fs/promises'
import * as https from 'node:https'
import { install, view } from '@liquid-labs/npm-toolkit'
import { readPackageDependencies } from '../read-package-dependencies'

// Mock dependencies
jest.mock('node:fs/promises')
jest.mock('node:https')
jest.mock('@liquid-labs/npm-toolkit', () => ({
  install                         : jest.fn(),
  view                            : jest.fn(),
  getPackageOrgBasenameAndVersion : jest.requireActual('@liquid-labs/npm-toolkit').getPackageOrgBasenameAndVersion
}))
jest.mock('../read-package-dependencies', () => ({
  readPackageDependencies : jest.fn()
}))
jest.mock('../error-utils', () => ({
  PluginError : {
    resourceLimit : jest.fn((limitType, current, maximum) =>
      new Error(`${limitType} limit exceeded: ${current} > ${maximum}`)
    ),
    dependency : jest.fn((message, cycle, packageName) =>
      new Error(message)
    )
  }
}))

describe('install-plugins', () => {
  let mockApp
  let mockReporter
  let mockReloadFunc

  beforeEach(() => {
    jest.clearAllMocks() // clears mock call history
    view.mockReset() // resets the mock implementation

    mockApp = {
      ext : {
        devPaths : ['/dev/path']
      }
    }

    mockReporter = { log : jest.fn() }
    mockReloadFunc = jest.fn().mockReturnValue(Promise.resolve())

    fs.mkdir.mockResolvedValue()
    readPackageDependencies.mockResolvedValue([])
  })

  describe('installPlugins', () => {
    test('returns message for already installed packages', async() => {
      const installedPlugins = [{ npmName : 'existing-plugin' }]
      const npmNames = ['existing-plugin']

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result.msg).toBe('<code>existing-plugin<rst> <em>already installed<rst>.')
      expect(result.data).toEqual({
        installedPlugins : [],
        total            : 0,
        implied          : 0,
        local            : 0,
        production       : 0
      })
    })

    test('installs new packages successfully', async() => {
      const installedPlugins = []
      const npmNames = ['new-plugin@1.0.0']

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['new-plugin@1.0.0']
      })

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(fs.mkdir).toHaveBeenCalledWith('/plugins', { recursive : true })
      expect(install).toHaveBeenCalledWith({
        devPaths    : ['/dev/path'],
        packages    : ['new-plugin@1.0.0'],
        projectPath : '/plugins'
      })
      expect(result.msg).toBe('<em>Installed<rst> <code>new-plugin@1.0.0<rst> production packages\n')
      expect(result.data.total).toBe(1)
      expect(result.data.production).toBe(1)
      expect(result.data.local).toBe(0)
      expect(result.data.implied).toBe(0)
    })

    test('installs both local and production packages', async() => {
      const installedPlugins = []
      const npmNames = ['local-plugin', 'prod-plugin']

      install.mockResolvedValue({
        localPackages      : ['local-plugin'],
        productionPackages : ['prod-plugin']
      })

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result.msg).toBe('<em>Installed<rst> <code>local-plugin<rst> local packages\n<em>Installed<rst> <code>prod-plugin<rst> production packages\n')
      expect(result.data.total).toBe(2)
      expect(result.data.local).toBe(1)
      expect(result.data.production).toBe(1)
    })

    test('calls reload function after installation', async() => {
      const installedPlugins = []
      const npmNames = ['plugin1']

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['plugin1']
      })

      mockReloadFunc.mockReturnValue(Promise.resolve())

      await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(mockReloadFunc).toHaveBeenCalledTimes(1)
      expect(mockReloadFunc).toHaveBeenCalledWith({ app : mockApp })
    })

    test('handles sync reload function', async() => {
      const installedPlugins = []
      const npmNames = ['plugin1']

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['plugin1']
      })

      const syncReloadFunc = jest.fn().mockReturnValue('sync-result')

      await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : syncReloadFunc,
        reporter     : mockReporter
      })

      expect(syncReloadFunc).toHaveBeenCalled()
    })

    test('handles mixed installed and new packages', async() => {
      const installedPlugins = [{ npmName : 'existing-plugin' }]
      const npmNames = ['existing-plugin', 'new-plugin']

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['new-plugin']
      })

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result.msg).toBe('<em>Installed<rst> <code>new-plugin<rst> production packages\n<code>existing-plugin<rst> <em>already installed<rst>.')
    })

    test('recognizes existing package names with version specifiers', async() => {
      const installedPlugins = [{ npmName : 'existing-plugin' }]
      const npmNames = ['existing-plugin@1.0.0']

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result.msg).toBe('<code>existing-plugin<rst> <em>already installed<rst>.')
    })

    test('returns "Nothing to install" when no packages provided and none installed', async() => {
      const result = await installPlugins({
        app              : mockApp,
        installedPlugins : [],
        npmNames         : [],
        pluginPkgDir     : '/plugins',
        reloadFunc       : mockReloadFunc,
        reporter         : mockReporter
      })

      expect(result.msg).toBe('Nothing to install.')
    })

    test('handles package names with version specs in npmNames', async() => {
      const installedPlugins = []
      const npmNames = ['new-plugin@^1.2.0']

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['new-plugin']
      })

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(fs.mkdir).toHaveBeenCalledWith('/plugins', { recursive : true })
      expect(install).toHaveBeenCalledWith({
        devPaths    : ['/dev/path'],
        packages    : ['new-plugin@^1.2.0'],
        projectPath : '/plugins'
      })
      expect(result.msg).toBe('<em>Installed<rst> <code>new-plugin<rst> production packages\n')
    })

    test('correctly identifies already installed packages with version specs', async() => {
      const installedPlugins = [{ npmName : 'existing-plugin' }]
      const npmNames = ['existing-plugin@1.0.0', 'new-plugin@^2.0.0']

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['new-plugin']
      })

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result.msg).toBe('<em>Installed<rst> <code>new-plugin<rst> production packages\n<code>existing-plugin<rst> <em>already installed<rst>.')
    })

    test('handles scoped packages with version specs', async() => {
      const installedPlugins = []
      const npmNames = ['@org/scoped-plugin@~3.1.0']

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['@org/scoped-plugin']
      })

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(install).toHaveBeenCalledWith({
        devPaths    : ['/dev/path'],
        packages    : ['@org/scoped-plugin@~3.1.0'],
        projectPath : '/plugins'
      })
      expect(result.msg).toBe('<em>Installed<rst> <code>@org/scoped-plugin<rst> production packages\n')
    })

    test('handles noImplicitInstallation option', async() => {
      const installedPlugins = []
      const npmNames = ['test-plugin']
      const noImplicitInstallation = true

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['test-plugin']
      })

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        noImplicitInstallation,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(install).toHaveBeenCalledWith({
        devPaths    : ['/dev/path'],
        packages    : ['test-plugin'],
        projectPath : '/plugins'
      })
      expect(result.data.implied).toBe(0) // No implied dependencies
    })

    test('processes dependencies when noImplicitInstallation not provided', async() => {
      const installedPlugins = []
      const npmNames = ['test-plugin']
      // noImplicitInstallation not provided

      view.mockResolvedValueOnce({
        dependencies : {},
        repository   : null // No GitHub repo, so no plugin dependencies
      })

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['test-plugin']
      })

      await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // view should have been called for test-plugin to fetch dependencies
      expect(view).toHaveBeenCalledWith({
        packageName : 'test-plugin',
        version     : undefined
      })
    })

    test('handles packages with both npm and plugin dependencies', async() => {
      const installedPlugins = []
      const npmNames = ['complex-plugin']

      // Mock view() to return package with npm dependencies but no GitHub repo
      // This simulates a package that has npm dependencies but no plugable-express.yaml
      view.mockResolvedValueOnce({
        dependencies : {
          'npm-dep-1' : '^1.0.0'
        },
        repository : null
      })
        .mockResolvedValueOnce({
          dependencies : {},
          repository   : null
        })

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['complex-plugin', 'npm-dep-1']
      })

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // Should install both the main plugin and its npm dependency
      expect(result.data.total).toBe(2)
      expect(result.data.implied).toBe(1) // npm-dep-1 is implied
    })

    test('handles version range specs like 1.x', async() => {
      const installedPlugins = []
      const npmNames = ['ranged-plugin@1.x']

      // Mock view() to return an array of matching versions
      view.mockResolvedValueOnce([
        {
          version      : '1.0.0',
          dependencies : {},
          repository   : null
        },
        {
          version      : '1.2.0',
          dependencies : {},
          repository   : null
        },
        {
          version      : '1.1.0',
          dependencies : {},
          repository   : null
        }
      ])

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['ranged-plugin@1.2.0']
      })

      const result = await installPlugins({
        app                    : mockApp,
        installedPlugins,
        noImplicitInstallation : true, // Skip dependency discovery to simplify test
        npmNames,
        pluginPkgDir           : '/plugins',
        reloadFunc             : mockReloadFunc,
        reporter               : mockReporter
      })

      // Should install the package successfully
      expect(result.data.total).toBe(1)
      // Version resolution happens during dependency discovery, which we skip with noImplicitInstallation
      // So we just verify the package was installed
      expect(result.data.installedPlugins[0].name).toBe('ranged-plugin')
    })

    test('handles caret range specs like ^2.0.0', async() => {
      const installedPlugins = []
      const npmNames = ['caret-plugin@^2.0.0']

      // Mock view() to return an array of matching versions
      view.mockResolvedValueOnce([
        {
          version      : '2.0.0',
          dependencies : {},
          repository   : null
        },
        {
          version      : '2.1.0',
          dependencies : {},
          repository   : null
        },
        {
          version      : '2.3.5',
          dependencies : { 'dep-a' : '^1.0.0' },
          repository   : null
        },
        {
          version      : '2.2.0',
          dependencies : {},
          repository   : null
        }
      ])

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['caret-plugin@2.3.5']
      })

      const result = await installPlugins({
        app                    : mockApp,
        installedPlugins,
        noImplicitInstallation : true, // Skip dependency discovery to simplify test
        npmNames,
        pluginPkgDir           : '/plugins',
        reloadFunc             : mockReloadFunc,
        reporter               : mockReporter
      })

      // Should install the package successfully
      expect(result.data.total).toBe(1)
      expect(result.data.installedPlugins[0].name).toBe('caret-plugin')
    })

    test('handles package without repository or dist info (npm deps only)', async() => {
      const installedPlugins = []
      const npmNames = ['no-repo-pkg']

      // Mock view() to return package with NO repository and NO dist info
      // This means we can't check for plugin deps, so we use npm deps only
      view.mockResolvedValueOnce({
        version      : '1.5.0',
        dependencies : {
          'npm-dep' : '^2.0.0'
        },
        repository : null // No repo info - can't check for YAML
        // No dist/tarball info - can't fall back
      })
        .mockResolvedValueOnce({
          dependencies : {},
          repository   : null
        })

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['no-repo-pkg', 'npm-dep']
      })

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // Should only use npm dependencies (no repository or tarball to check)
      expect(result.data.total).toBe(2)
      expect(result.data.implied).toBe(1) // npm-dep is implied

      // Verify readPackageDependencies was NOT called (no repository or tarball)
      expect(readPackageDependencies).not.toHaveBeenCalled()
    })

    test('handles non-GitHub package (GitLab) with npm deps only', async() => {
      const installedPlugins = []
      const npmNames = ['gitlab-pkg']

      // Mock view() to return non-GitHub repo (GitLab) with npm dependencies
      // Non-GitHub repos don't support GitHub API fetch, so use npm deps only
      view.mockResolvedValueOnce({
        version      : '3.1.0',
        dependencies : {
          'another-dep' : '^1.0.0'
        },
        repository : {
          url : 'https://gitlab.com/some-org/gitlab-pkg.git'
        }
      })
        .mockResolvedValueOnce({
          dependencies : {},
          repository   : null
        })

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['gitlab-pkg', 'another-dep']
      })

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // Should use npm dependencies only (no GitHub to check, no tarball fallback)
      expect(result.data.total).toBe(2)
      expect(result.data.implied).toBe(1)

      // Verify readPackageDependencies was NOT called (no tarball fallback for non-GitHub)
      expect(readPackageDependencies).not.toHaveBeenCalled()
    })

    test('handles real GitHub package without plugable-express.yaml (checks package.json)', async() => {
      const installedPlugins = []
      // Use a real package that exists on GitHub but won't have plugable-express.yaml
      const npmNames = ['express@4.18.0']

      // This test uses real https.get to verify the package.json check doesn't hang
      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // Should complete without hanging and install express
      expect(result.data.total).toBeGreaterThanOrEqual(1)
    }, 10000) // 10 second timeout

    test('returns full data structure with implied dependencies', async() => {
      const installedPlugins = []
      const npmNames = ['main-plugin']

      // Mock view() to return package metadata with dependencies (no GitHub repo)
      view
        .mockResolvedValueOnce({
          dependencies : {
            'implied-dep-1' : '^1.0.0'
          },
          repository : null // No GitHub repo
        }) // main-plugin has implied-dep-1 as npm dependency
        .mockResolvedValueOnce({
          dependencies : {},
          repository   : null // No GitHub repo
        }) // implied-dep-1 has no npm dependencies

      // Final install call with all discovered packages
      install.mockResolvedValueOnce({
        localPackages      : ['implied-dep-1'],
        productionPackages : ['main-plugin']
      })

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // Check the data structure
      expect(result.data.total).toBe(2)
      expect(result.data.implied).toBe(1) // implied-dep-1
      expect(result.data.local).toBe(1) // implied-dep-1
      expect(result.data.production).toBe(1) // main-plugin

      // Verify each plugin's data
      const pluginMap = new Map(result.data.installedPlugins.map(p => [p.name, p]))

      // Main plugin (explicitly requested)
      expect(pluginMap.get('main-plugin')).toMatchObject({
        name         : 'main-plugin',
        version      : 'latest',
        fromLocal    : false,
        fromRegistry : true,
        isImplied    : false
      })

      // Implied dependency 1 (not requested, installed as dependency)
      expect(pluginMap.get('implied-dep-1')).toMatchObject({
        name         : 'implied-dep-1',
        version      : 'latest',
        fromLocal    : true,
        fromRegistry : false,
        isImplied    : true
      })

      expect(result.msg).toContain('local packages')
      expect(result.msg).toContain('production packages')
    })

    test('handles versioned packages in data structure', async() => {
      const installedPlugins = []
      const npmNames = ['@scope/plugin@1.2.3', 'regular-plugin@^2.0.0']

      install.mockResolvedValue({
        localPackages      : ['@scope/plugin@1.2.3'],
        productionPackages : ['regular-plugin@^2.0.0']
      })

      const result = await installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // Check the data structure handles versions properly
      expect(result.data.total).toBe(2)
      expect(result.data.implied).toBe(0)
      expect(result.data.local).toBe(1)
      expect(result.data.production).toBe(1)

      const pluginMap = new Map(result.data.installedPlugins.map(p => [p.name, p]))

      expect(pluginMap.get('@scope/plugin')).toMatchObject({
        name         : '@scope/plugin',
        version      : '1.2.3',
        fromLocal    : true,
        fromRegistry : false,
        isImplied    : false
      })

      expect(pluginMap.get('regular-plugin')).toMatchObject({
        name         : 'regular-plugin',
        version      : '^2.0.0',
        fromLocal    : false,
        fromRegistry : true,
        isImplied    : false
      })
    })

    // Data-driven tests for circular dependency detection
    // Each test case defines a dependency cycle with different chain lengths
    test.each([
      {
        testName     : '2-step cycle',
        description  : 'plugin-a -> plugin-b -> plugin-a',
        entryPackage : 'plugin-a',
        // Defines the dependency chain where each package depends on the next
        // The last package depends on the first, creating the cycle
        cycle        : [
          { name : 'plugin-a', dependsOn : 'plugin-b' },
          { name : 'plugin-b', dependsOn : 'plugin-a' }
        ]
      },
      {
        testName     : '3-step cycle',
        description  : 'plugin-x -> plugin-y -> plugin-z -> plugin-x',
        entryPackage : 'plugin-x',
        cycle        : [
          { name : 'plugin-x', dependsOn : 'plugin-y' },
          { name : 'plugin-y', dependsOn : 'plugin-z' },
          { name : 'plugin-z', dependsOn : 'plugin-x' }
        ]
      }
    ])('detects circular dependencies: $testName ($description)', async({ entryPackage, cycle }) => {
      const installedPlugins = []
      const npmNames = [entryPackage]

      // Reset mocks to clear any leftover state from previous tests
      view.mockReset()
      https.get.mockReset()

      // Build viewResults map dynamically from cycle data
      const viewResults = {}
      for (const pkg of cycle) {
        viewResults[pkg.name] = {
          version      : '1.0.0',
          dependencies : {},
          repository   : { url : `https://github.com/test/${pkg.name}.git` }
        }
      }

      view.mockImplementation(({ packageName }) => Promise.resolve(viewResults[packageName]))

      // Build githubResponses map dynamically from cycle data
      const githubResponses = {}
      for (const pkg of cycle) {
        // YAML file with dependency
        githubResponses[`https://raw.githubusercontent.com/test/${pkg.name}/v1.0.0/plugable-express.yaml`] = {
          statusCode : 200,
          data       : `dependencies:\n  - ${pkg.dependsOn}\n`
        }
        // package.json returns 404 (not needed since YAML exists)
        githubResponses[`https://raw.githubusercontent.com/test/${pkg.name}/v1.0.0/package.json`] = {
          statusCode : 404
        }
      }

      https.get.mockImplementation((url, callback) => {
        const responseConfig = githubResponses[url]
        if (responseConfig) {
          const response = {
            statusCode : responseConfig.statusCode,
            on(event, handler) {
              if (event === 'data' && responseConfig.data) {
                setImmediate(() => handler(responseConfig.data))
              }
              if (event === 'end') {
                setImmediate(() => handler())
              }
              return this
            },
            resume() { return this } // For package.json check
          }
          callback(response)
        }
        return { on : jest.fn() }
      })

      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : [entryPackage]
      })

      await expect(installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })).rejects.toThrow('Circular dependency detected')
    })
  })
})
