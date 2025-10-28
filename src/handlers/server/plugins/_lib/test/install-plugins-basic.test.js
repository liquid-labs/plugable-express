/* global beforeEach describe expect jest test */

import { installPlugins } from '../install-plugins'

import * as fs from 'node:fs/promises'
import { install, view } from '@liquid-labs/npm-toolkit'

// Mock dependencies
jest.mock('node:fs/promises')
jest.mock('@liquid-labs/npm-toolkit', () => ({
  install                         : jest.fn(),
  view                            : jest.fn(),
  getPackageOrgBasenameAndVersion : jest.requireActual('@liquid-labs/npm-toolkit').getPackageOrgBasenameAndVersion
}))
jest.mock('../error-utils', () => ({
  PluginError : {
    resourceLimit : jest.fn((limitType, current, maximum) =>
      new Error(`${limitType} limit exceeded: ${current} > ${maximum}`)
    )
  }
}))

describe('install-plugins-basic', () => {
  let mockReporter
  let mockReloadFunc

  beforeEach(() => {
    jest.clearAllMocks()
    view.mockReset()

    mockReporter = { log : jest.fn() }
    mockReloadFunc = jest.fn().mockReturnValue(Promise.resolve())

    fs.mkdir.mockResolvedValue()
  })

  describe('installPlugins - basic scenarios', () => {
    test('returns message for already installed packages', async() => {
      const installedPlugins = [{ npmName : 'existing-plugin' }]
      const npmNames = ['existing-plugin']

      const result = await installPlugins({
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
        production       : 0
      })
    })

    test('installs new packages successfully', async() => {
      const installedPlugins = []
      const npmNames = ['new-plugin@1.0.0']

      // Mock npm-toolkit install
      install.mockResolvedValue({
        productionPackages : ['new-plugin@1.0.0']
      })

      // Mock view to return package with pluggable-endpoints keyword
      view.mockResolvedValue({
        keywords : ['pluggable-endpoints']
      })

      const result = await installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(fs.mkdir).toHaveBeenCalledWith('/plugins', { recursive : true })
      expect(install).toHaveBeenCalledWith({
        packages    : ['new-plugin@1.0.0'],
        projectPath : '/plugins'
      })
      expect(result.msg).toBe('<em>Installed<rst> <code>new-plugin@1.0.0<rst> production packages\n')
      expect(result.data.total).toBe(1)
      expect(result.data.production).toBe(1)
    })

    test('calls reload function after installation', async() => {
      const installedPlugins = []
      const npmNames = ['plugin1']

      install.mockResolvedValue({
        productionPackages : ['plugin1']
      })

      view.mockResolvedValue({
        keywords : ['pluggable-endpoints']
      })

      mockReloadFunc.mockReturnValue(Promise.resolve())

      await installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(mockReloadFunc).toHaveBeenCalledTimes(1)
    })

    test('handles sync reload function', async() => {
      const installedPlugins = []
      const npmNames = ['plugin1']

      install.mockResolvedValue({
        productionPackages : ['plugin1']
      })

      view.mockResolvedValue({
        keywords : ['pluggable-endpoints']
      })

      const syncReloadFunc = jest.fn().mockReturnValue('sync-result')

      await installPlugins({
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
        productionPackages : ['new-plugin']
      })

      view.mockResolvedValue({
        keywords : ['pluggable-endpoints']
      })

      const result = await installPlugins({
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
        productionPackages : ['new-plugin']
      })

      view.mockResolvedValue({
        keywords : ['pluggable-endpoints']
      })

      const result = await installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(fs.mkdir).toHaveBeenCalledWith('/plugins', { recursive : true })
      expect(install).toHaveBeenCalledWith({
        packages    : ['new-plugin@^1.2.0'],
        projectPath : '/plugins'
      })
      expect(result.msg).toBe('<em>Installed<rst> <code>new-plugin<rst> production packages\n')
    })

    test('handles scoped packages with version specs', async() => {
      const installedPlugins = []
      const npmNames = ['@org/scoped-plugin@~3.1.0']

      install.mockResolvedValue({
        productionPackages : ['@org/scoped-plugin']
      })

      view.mockResolvedValue({
        keywords : ['pluggable-endpoints']
      })

      const result = await installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(install).toHaveBeenCalledWith({
        packages    : ['@org/scoped-plugin@~3.1.0'],
        projectPath : '/plugins'
      })
      expect(result.msg).toBe('<em>Installed<rst> <code>@org/scoped-plugin<rst> production packages\n')
    })

    test('correctly identifies already installed packages with version specs', async() => {
      const installedPlugins = [{ npmName : 'existing-plugin' }]
      const npmNames = ['existing-plugin@1.0.0', 'new-plugin@^2.0.0']

      install.mockResolvedValue({
        productionPackages : ['new-plugin']
      })

      view.mockResolvedValue({
        keywords : ['pluggable-endpoints']
      })

      const result = await installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      expect(result.msg).toBe('<em>Installed<rst> <code>new-plugin<rst> production packages\n<code>existing-plugin<rst> <em>already installed<rst>.')
    })
  })
})
