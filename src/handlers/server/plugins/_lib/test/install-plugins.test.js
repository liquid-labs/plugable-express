/* global beforeEach describe expect jest test */

import { installPlugins } from '../install-plugins'

import * as fs from 'node:fs/promises'
import { install } from '@liquid-labs/npm-toolkit'
import { determineRegistryData } from '../registry-utils'
import { selectMatchingSeries } from '../plugin-selection'
import { determineInstallationOrder } from '../installation-order'

// Mock dependencies
jest.mock('node:fs/promises')
jest.mock('@liquid-labs/npm-toolkit')
jest.mock('../registry-utils')
jest.mock('../plugin-selection')
jest.mock('../installation-order')

describe('install-plugins', () => {
  let mockApp
  let mockCache
  let mockReporter
  let mockReloadFunc

  beforeEach(() => {
    jest.clearAllMocks()

    mockApp = {
      ext : {
        devPaths       : ['/dev/path'],
        serverSettings : { registries : ['http://registry.com'] }
      }
    }

    mockCache = { get : jest.fn(), put : jest.fn() }
    mockReporter = { log : jest.fn() }
    mockReloadFunc = jest.fn().mockReturnValue(undefined)

    fs.mkdir.mockResolvedValue()
  })

  describe('installPlugins', () => {
    test('returns message for already installed packages', async() => {
      const installedPlugins = [{ npmName : 'existing-plugin' }]
      const npmNames = ['existing-plugin']

      const result = await installPlugins({
        app          : mockApp,
        cache        : mockCache,
        hostVersion  : '1.0.0',
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        pluginType   : 'server',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result).toBe('<code>existing-plugin<rst> <em>already installed<rst>.')
      expect(determineRegistryData).not.toHaveBeenCalled()
    })

    test('installs new packages successfully', async() => {
      const installedPlugins = []
      const npmNames = ['new-plugin@1.0.0']

      determineRegistryData.mockResolvedValue({ registry : { id : 'test' } })
      selectMatchingSeries.mockReturnValue([{ plugins : { server : [] } }])
      determineInstallationOrder.mockResolvedValue([['new-plugin@1.0.0']])
      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['new-plugin']
      })

      const result = await installPlugins({
        app          : mockApp,
        cache        : mockCache,
        hostVersion  : '1.0.0',
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        pluginType   : 'server',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(fs.mkdir).toHaveBeenCalledWith('/plugins', { recursive : true })
      expect(install).toHaveBeenCalledWith({
        devPaths    : ['/dev/path'],
        packages    : ['new-plugin@1.0.0'],
        projectPath : '/plugins'
      })
      expect(result).toBe('<em>Installed<rst> <code>new-plugin<rst> production packages\n')
    })

    test('installs both local and production packages', async() => {
      const installedPlugins = []
      const npmNames = ['local-plugin', 'prod-plugin']

      determineRegistryData.mockResolvedValue({ registry : { id : 'test' } })
      selectMatchingSeries.mockReturnValue([{ plugins : { server : [] } }])
      determineInstallationOrder.mockResolvedValue([['local-plugin', 'prod-plugin']])
      install.mockResolvedValue({
        localPackages      : ['local-plugin'],
        productionPackages : ['prod-plugin']
      })

      const result = await installPlugins({
        app          : mockApp,
        cache        : mockCache,
        hostVersion  : '1.0.0',
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        pluginType   : 'server',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result).toBe('<em>Installed<rst> <code>local-plugin<rst> local packages\n<em>Installed<rst> <code>prod-plugin<rst> production packages\n')
    })

    test('calls reload function after each installation series', async() => {
      const installedPlugins = []
      const npmNames = ['plugin1', 'plugin2']

      determineRegistryData.mockResolvedValue({ registry : { id : 'test' } })
      selectMatchingSeries.mockReturnValue([{ plugins : { server : [] } }])
      determineInstallationOrder.mockResolvedValue([['plugin1'], ['plugin2']])
      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['plugin1']
      })

      mockReloadFunc.mockReturnValue(Promise.resolve())

      await installPlugins({
        app          : mockApp,
        cache        : mockCache,
        hostVersion  : '1.0.0',
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        pluginType   : 'server',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(mockReloadFunc).toHaveBeenCalledTimes(2)
      expect(mockReloadFunc).toHaveBeenCalledWith({ app : mockApp })
    })

    test('handles sync reload function', async() => {
      const installedPlugins = []
      const npmNames = ['plugin1']

      determineRegistryData.mockResolvedValue({ registry : { id : 'test' } })
      selectMatchingSeries.mockReturnValue([{ plugins : { server : [] } }])
      determineInstallationOrder.mockResolvedValue([['plugin1']])
      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['plugin1']
      })

      const syncReloadFunc = jest.fn().mockReturnValue('sync-result')

      await installPlugins({
        app          : mockApp,
        cache        : mockCache,
        hostVersion  : '1.0.0',
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        pluginType   : 'server',
        reloadFunc   : syncReloadFunc,
        reporter     : mockReporter
      })

      expect(syncReloadFunc).toHaveBeenCalled()
    })

    test('handles mixed installed and new packages', async() => {
      const installedPlugins = [{ npmName : 'existing-plugin' }]
      const npmNames = ['existing-plugin', 'new-plugin']

      determineRegistryData.mockResolvedValue({ registry : { id : 'test' } })
      selectMatchingSeries.mockReturnValue([{ plugins : { server : [] } }])
      determineInstallationOrder.mockResolvedValue([['new-plugin']])
      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['new-plugin']
      })

      const result = await installPlugins({
        app          : mockApp,
        cache        : mockCache,
        hostVersion  : '1.0.0',
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        pluginType   : 'server',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result).toBe('<em>Installed<rst> <code>new-plugin<rst> production packages\n<code>existing-plugin<rst> <em>already installed<rst>.')
    })

    test('handles package names with version specifiers', async() => {
      const installedPlugins = [{ npmName : 'existing-plugin' }]
      const npmNames = ['existing-plugin@1.0.0']

      const result = await installPlugins({
        app          : mockApp,
        cache        : mockCache,
        hostVersion  : '1.0.0',
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        pluginType   : 'server',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result).toBe('<code>existing-plugin<rst> <em>already installed<rst>.')
    })

    test('returns "Nothing to install" when no packages provided and none installed', async() => {
      const result = await installPlugins({
        app              : mockApp,
        cache            : mockCache,
        hostVersion      : '1.0.0',
        installedPlugins : [],
        npmNames         : [],
        pluginPkgDir     : '/plugins',
        pluginType       : 'server',
        reloadFunc       : mockReloadFunc,
        reporter         : mockReporter
      })

      expect(result).toBe('Nothing to install.')
    })
  })
})
