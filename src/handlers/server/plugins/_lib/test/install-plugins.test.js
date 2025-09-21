/* global beforeEach describe expect jest test */

import { installPlugins } from '../install-plugins'

import * as fs from 'node:fs/promises'
import { install } from '@liquid-labs/npm-toolkit'
import { determineInstallationOrder } from '../installation-order'

// Mock dependencies
jest.mock('node:fs/promises')
jest.mock('@liquid-labs/npm-toolkit', () => ({
  install                         : jest.fn(),
  getPackageOrgBasenameAndVersion : jest.requireActual('@liquid-labs/npm-toolkit').getPackageOrgBasenameAndVersion
}))
jest.mock('../installation-order')

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

      determineInstallationOrder.mockResolvedValue([['new-plugin@1.0.0']])
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

      determineInstallationOrder.mockResolvedValue([['local-plugin', 'prod-plugin']])
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

    test('calls reload function after each installation series', async() => {
      const installedPlugins = []
      const npmNames = ['plugin1', 'plugin2']

      determineInstallationOrder.mockResolvedValue([['plugin1'], ['plugin2']])
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

      expect(mockReloadFunc).toHaveBeenCalledTimes(2)
      expect(mockReloadFunc).toHaveBeenCalledWith({ app : mockApp })
    })

    test('handles sync reload function', async() => {
      const installedPlugins = []
      const npmNames = ['plugin1']

      determineInstallationOrder.mockResolvedValue([['plugin1']])
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

      determineInstallationOrder.mockResolvedValue([['new-plugin']])
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

    test('handles package names with version specifiers', async() => {
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

      determineInstallationOrder.mockResolvedValue([['new-plugin@^1.2.0']])
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

      determineInstallationOrder.mockResolvedValue([['new-plugin@^2.0.0']])
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

      determineInstallationOrder.mockResolvedValue([['@org/scoped-plugin@~3.1.0']])
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

    test('passes noImplicitInstallation to determineInstallationOrder', async() => {
      const installedPlugins = []
      const npmNames = ['test-plugin']
      const noImplicitInstallation = true

      determineInstallationOrder.mockResolvedValue([['test-plugin']])
      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['test-plugin']
      })

      await installPlugins({
        app          : mockApp,
        installedPlugins,
        noImplicitInstallation,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(determineInstallationOrder).toHaveBeenCalledWith({
        installedPlugins,
        noImplicitInstallation : true,
        packageDir             : '/plugins',
        toInstall              : ['test-plugin']
      })
    })

    test('passes undefined noImplicitInstallation to determineInstallationOrder when not provided', async() => {
      const installedPlugins = []
      const npmNames = ['test-plugin']
      // noImplicitInstallation not provided

      determineInstallationOrder.mockResolvedValue([['test-plugin']])
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

      expect(determineInstallationOrder).toHaveBeenCalledWith({
        installedPlugins,
        noImplicitInstallation : undefined,
        packageDir             : '/plugins',
        toInstall              : ['test-plugin']
      })
    })

    test('returns full data structure with implied dependencies', async() => {
      const installedPlugins = []
      const npmNames = ['main-plugin', 'explicit-plugin']

      // Simulating that determineInstallationOrder added implied-dep-1 and implied-dep-2
      determineInstallationOrder.mockResolvedValue([
        ['main-plugin', 'implied-dep-1'],
        ['explicit-plugin', 'implied-dep-2']
      ])

      // First series: main-plugin (production), implied-dep-1 (local)
      install.mockResolvedValueOnce({
        localPackages      : ['implied-dep-1'],
        productionPackages : ['main-plugin']
      })

      // Second series: explicit-plugin (production), implied-dep-2 (production)
      install.mockResolvedValueOnce({
        localPackages      : [],
        productionPackages : ['explicit-plugin', 'implied-dep-2']
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
      expect(result.data.total).toBe(4)
      expect(result.data.implied).toBe(2) // implied-dep-1 and implied-dep-2
      expect(result.data.local).toBe(1) // implied-dep-1
      expect(result.data.production).toBe(3) // main-plugin, explicit-plugin, implied-dep-2

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

      // Explicit plugin (explicitly requested)
      expect(pluginMap.get('explicit-plugin')).toMatchObject({
        name         : 'explicit-plugin',
        version      : 'latest',
        fromLocal    : false,
        fromRegistry : true,
        isImplied    : false
      })

      // Implied dependency 1 (not requested, added by determineInstallationOrder)
      expect(pluginMap.get('implied-dep-1')).toMatchObject({
        name         : 'implied-dep-1',
        version      : 'latest',
        fromLocal    : true,
        fromRegistry : false,
        isImplied    : true
      })

      // Implied dependency 2 (not requested, added by determineInstallationOrder)
      expect(pluginMap.get('implied-dep-2')).toMatchObject({
        name         : 'implied-dep-2',
        version      : 'latest',
        fromLocal    : false,
        fromRegistry : true,
        isImplied    : true
      })

      expect(result.msg).toContain('local packages')
      expect(result.msg).toContain('production packages')
    })

    test('handles versioned packages in data structure', async() => {
      const installedPlugins = []
      const npmNames = ['@scope/plugin@1.2.3', 'regular-plugin@^2.0.0']

      determineInstallationOrder.mockResolvedValue([
        ['@scope/plugin@1.2.3', 'regular-plugin@^2.0.0']
      ])

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
  })
})
