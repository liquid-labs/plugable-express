/* global beforeEach describe expect jest test */

import { installPlugins } from '../install-plugins'

import * as fs from 'node:fs/promises'
import { install } from '@liquid-labs/npm-toolkit'
import { readPackageDependencies } from '../read-package-dependencies'
import { PluginError } from '../error-utils'

// Mock dependencies
jest.mock('node:fs/promises')
jest.mock('@liquid-labs/npm-toolkit', () => ({
  install                         : jest.fn(),
  getPackageOrgBasenameAndVersion : jest.requireActual('@liquid-labs/npm-toolkit').getPackageOrgBasenameAndVersion
}))
jest.mock('../read-package-dependencies', () => ({
  readPackageDependencies: jest.fn()
}))
jest.mock('../error-utils', () => ({
  PluginError: {
    resourceLimit: jest.fn((limitType, current, maximum) =>
      new Error(`${limitType} limit exceeded: ${current} > ${maximum}`)
    ),
    dependency: jest.fn((message, cycle, packageName) =>
      new Error(message)
    )
  }
}))

describe('install-plugins', () => {
  let mockApp
  let mockReporter
  let mockReloadFunc

  beforeEach(() => {
    jest.clearAllMocks()

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

      // readPackageDependencies should have been called for test-plugin
      expect(readPackageDependencies).toHaveBeenCalledWith('test-plugin', '/plugins')
    })

    test('returns full data structure with implied dependencies', async() => {
      const installedPlugins = []
      const npmNames = ['main-plugin']

      // First call: install main-plugin
      install.mockResolvedValueOnce({
        localPackages      : [],
        productionPackages : ['main-plugin']
      })

      // Mock main-plugin to have implied-dep-1 as dependency
      readPackageDependencies
        .mockResolvedValueOnce(['implied-dep-1']) // main-plugin's dependencies
        .mockResolvedValueOnce([]) // implied-dep-1 has no dependencies

      // Second call: install implied-dep-1 (recursive call for dependencies)
      install.mockResolvedValueOnce({
        localPackages      : ['implied-dep-1'],
        productionPackages : []
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

    test('detects and throws error for cyclic dependencies', async() => {
      const installedPlugins = []
      const npmNames = ['plugin-a']

      // First call: install plugin-a
      install.mockResolvedValueOnce({
        localPackages      : [],
        productionPackages : ['plugin-a']
      })

      // Mock plugin-a to have plugin-b as dependency
      readPackageDependencies
        .mockResolvedValueOnce(['plugin-b']) // plugin-a depends on plugin-b

      // Second call: install plugin-b
      install.mockResolvedValueOnce({
        localPackages      : [],
        productionPackages : ['plugin-b']
      })

      // Mock plugin-b to have plugin-a as dependency (creates cycle)
      readPackageDependencies
        .mockResolvedValueOnce(['plugin-a']) // plugin-b depends on plugin-a - cycle!

      await expect(installPlugins({
        app          : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })).rejects.toThrow('Circular dependency detected')
    })

    test('detects multi-level cyclic dependencies', async() => {
      const installedPlugins = []
      const npmNames = ['plugin-x']

      // First call: install plugin-x
      install.mockResolvedValueOnce({
        localPackages      : [],
        productionPackages : ['plugin-x']
      })

      // Mock plugin-x to have plugin-y as dependency
      readPackageDependencies
        .mockResolvedValueOnce(['plugin-y']) // plugin-x depends on plugin-y

      // Second call: install plugin-y
      install.mockResolvedValueOnce({
        localPackages      : [],
        productionPackages : ['plugin-y']
      })

      // Mock plugin-y to have plugin-z as dependency
      readPackageDependencies
        .mockResolvedValueOnce(['plugin-z']) // plugin-y depends on plugin-z

      // Third call: install plugin-z
      install.mockResolvedValueOnce({
        localPackages      : [],
        productionPackages : ['plugin-z']
      })

      // Mock plugin-z to have plugin-x as dependency (creates cycle)
      readPackageDependencies
        .mockResolvedValueOnce(['plugin-x']) // plugin-z depends on plugin-x - cycle!

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
