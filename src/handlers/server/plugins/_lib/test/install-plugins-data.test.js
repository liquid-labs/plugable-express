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

describe('install-plugins-data', () => {
  let mockReporter
  let mockReloadFunc

  beforeEach(() => {
    jest.clearAllMocks()
    view.mockReset()

    mockReporter = { log : jest.fn() }
    mockReloadFunc = jest.fn().mockReturnValue(Promise.resolve())

    fs.mkdir.mockResolvedValue()
  })

  describe('data structure validation', () => {
    test('returns correct data structure for single package', async() => {
      const installedPlugins = []
      const npmNames = ['test-plugin@1.2.3']

      install.mockResolvedValue({
        productionPackages : ['test-plugin@1.2.3']
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

      // Check overall structure
      expect(result).toHaveProperty('msg')
      expect(result).toHaveProperty('data')

      // Check data structure
      expect(result.data).toHaveProperty('installedPlugins')
      expect(result.data).toHaveProperty('total')
      expect(result.data).toHaveProperty('production')

      // Verify values
      expect(result.data.total).toBe(1)
      expect(result.data.production).toBe(1)
      expect(result.data.installedPlugins).toHaveLength(1)

      // Check plugin info structure
      const pluginInfo = result.data.installedPlugins[0]
      expect(pluginInfo).toHaveProperty('name', 'test-plugin')
      expect(pluginInfo).toHaveProperty('version', '1.2.3')
      expect(pluginInfo).toHaveProperty('fromRegistry', true)
      expect(pluginInfo).toHaveProperty('hasPluginKeyword', true)
    })

    test('handles versioned packages in data structure', async() => {
      const installedPlugins = []
      const npmNames = ['@scope/plugin@1.2.3', 'regular-plugin@^2.0.0']

      install.mockResolvedValue({
        productionPackages : ['@scope/plugin@1.2.3', 'regular-plugin@^2.0.0']
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

      // Check the data structure handles versions properly
      expect(result.data.total).toBe(2)
      expect(result.data.production).toBe(2)

      const pluginMap = new Map(result.data.installedPlugins.map(p => [p.name, p]))

      expect(pluginMap.get('@scope/plugin')).toMatchObject({
        name         : '@scope/plugin',
        version      : '1.2.3',
        fromRegistry : true
      })

      expect(pluginMap.get('regular-plugin')).toMatchObject({
        name         : 'regular-plugin',
        version      : '^2.0.0',
        fromRegistry : true
      })
    })

    test('handles package without version in return', async() => {
      const installedPlugins = []
      const npmNames = ['no-version-plugin']

      install.mockResolvedValue({
        productionPackages : ['no-version-plugin']
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

      const pluginInfo = result.data.installedPlugins[0]
      expect(pluginInfo.name).toBe('no-version-plugin')
      expect(pluginInfo.version).toBe('latest')
    })

    test('message formatting for single package', async() => {
      const installedPlugins = []
      const npmNames = ['plugin1']

      install.mockResolvedValue({
        productionPackages : ['plugin1']
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

      expect(result.msg).toBe('<em>Installed<rst> <code>plugin1<rst> production packages\n')
    })

    test('message formatting for multiple packages', async() => {
      const installedPlugins = []
      const npmNames = ['plugin1', 'plugin2', 'plugin3']

      install.mockResolvedValue({
        productionPackages : ['plugin1', 'plugin2', 'plugin3']
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

      expect(result.msg).toBe('<em>Installed<rst> <code>plugin1<rst>, <code>plugin2<rst>, <code>plugin3<rst> production packages\n')
    })

    test('message formatting with both new and already installed', async() => {
      const installedPlugins = [{ npmName : 'existing1' }, { npmName : 'existing2' }]
      const npmNames = ['new1', 'existing1', 'new2', 'existing2']

      install.mockResolvedValue({
        productionPackages : ['new1', 'new2']
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

      expect(result.msg).toContain('<em>Installed<rst>')
      expect(result.msg).toContain('new1')
      expect(result.msg).toContain('new2')
      expect(result.msg).toContain('<em>already installed<rst>')
      expect(result.msg).toContain('existing1')
      expect(result.msg).toContain('existing2')
    })

    test('data structure has no local packages field', async() => {
      const installedPlugins = []
      const npmNames = ['test-plugin']

      install.mockResolvedValue({
        productionPackages : ['test-plugin']
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

      // Verify no local or implied fields exist
      expect(result.data).not.toHaveProperty('local')
      expect(result.data).not.toHaveProperty('implied')

      // Verify plugin info doesn't have fromLocal field
      const pluginInfo = result.data.installedPlugins[0]
      expect(pluginInfo).not.toHaveProperty('fromLocal')
      expect(pluginInfo).not.toHaveProperty('isImplied')
    })
  })
})
