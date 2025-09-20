/* global beforeEach describe expect jest test */

import { installPlugins } from '../install-plugins'

import * as fs from 'node:fs/promises'
import { install } from '@liquid-labs/npm-toolkit'
import { determineInstallationOrder } from '../installation-order'

// Mock dependencies
jest.mock('node:fs/promises')
jest.mock('@liquid-labs/npm-toolkit')
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
        app : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result).toBe('<code>existing-plugin<rst> <em>already installed<rst>.')
    })

    test('installs new packages successfully', async() => {
      const installedPlugins = []
      const npmNames = ['new-plugin@1.0.0']

      determineInstallationOrder.mockResolvedValue([['new-plugin@1.0.0']])
      install.mockResolvedValue({
        localPackages      : [],
        productionPackages : ['new-plugin']
      })

      const result = await installPlugins({
        app : mockApp,
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
      expect(result).toBe('<em>Installed<rst> <code>new-plugin<rst> production packages\n')
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
        app : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result).toBe('<em>Installed<rst> <code>local-plugin<rst> local packages\n<em>Installed<rst> <code>prod-plugin<rst> production packages\n')
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
        app : mockApp,
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
        app : mockApp,
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
        app : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result).toBe('<em>Installed<rst> <code>new-plugin<rst> production packages\n<code>existing-plugin<rst> <em>already installed<rst>.')
    })

    test('handles package names with version specifiers', async() => {
      const installedPlugins = [{ npmName : 'existing-plugin' }]
      const npmNames = ['existing-plugin@1.0.0']

      const result = await installPlugins({
        app : mockApp,
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result).toBe('<code>existing-plugin<rst> <em>already installed<rst>.')
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

      expect(result).toBe('Nothing to install.')
    })
  })
})
