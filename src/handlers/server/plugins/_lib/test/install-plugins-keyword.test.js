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

describe('install-plugins-keyword', () => {
  let mockReporter
  let mockReloadFunc

  beforeEach(() => {
    jest.clearAllMocks()
    view.mockReset()

    mockReporter = { log : jest.fn() }
    mockReloadFunc = jest.fn().mockReturnValue(Promise.resolve())

    fs.mkdir.mockResolvedValue()
  })

  describe('keyword verification', () => {
    test('verifies package has pluggable-endpoints keyword', async() => {
      const installedPlugins = []
      const npmNames = ['valid-plugin']

      install.mockResolvedValue({
        productionPackages : ['valid-plugin']
      })

      view.mockResolvedValue({
        keywords : ['pluggable-endpoints', 'other-keyword']
      })

      await installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // Verify view was called to check keywords
      expect(view).toHaveBeenCalledWith({ packageName : 'valid-plugin' })

      // Should not log warning for valid plugin
      expect(mockReporter.log).not.toHaveBeenCalledWith(
        expect.stringContaining('does not have the \'pluggable-endpoints\' keyword')
      )
    })

    test('warns when package does not have pluggable-endpoints keyword', async() => {
      const installedPlugins = []
      const npmNames = ['invalid-plugin']

      install.mockResolvedValue({
        productionPackages : ['invalid-plugin']
      })

      view.mockResolvedValue({
        keywords : ['some-other-keyword']
      })

      await installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // Should log warning for package without keyword
      expect(mockReporter.log).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Package 'invalid-plugin' does not have the 'pluggable-endpoints' keyword")
      )
    })

    test('warns when package has no keywords', async() => {
      const installedPlugins = []
      const npmNames = ['no-keywords-plugin']

      install.mockResolvedValue({
        productionPackages : ['no-keywords-plugin']
      })

      view.mockResolvedValue({
        keywords : []
      })

      await installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // Should log warning for package without keywords
      expect(mockReporter.log).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Package 'no-keywords-plugin' does not have the 'pluggable-endpoints' keyword")
      )
    })

    test('handles view error gracefully', async() => {
      const installedPlugins = []
      const npmNames = ['error-plugin']

      install.mockResolvedValue({
        productionPackages : ['error-plugin']
      })

      view.mockRejectedValue(new Error('Network error'))

      const result = await installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // Should still complete installation
      expect(result.data.total).toBe(1)

      // Should log warning about verification failure
      expect(mockReporter.log).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Could not verify keywords for package 'error-plugin'")
      )
    })

    test('handles package with null keywords', async() => {
      const installedPlugins = []
      const npmNames = ['null-keywords-plugin']

      install.mockResolvedValue({
        productionPackages : ['null-keywords-plugin']
      })

      view.mockResolvedValue({
        keywords : null
      })

      await installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // Should log warning for package with null keywords
      expect(mockReporter.log).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Package 'null-keywords-plugin' does not have the 'pluggable-endpoints' keyword")
      )
    })

    test('handles package with undefined keywords', async() => {
      const installedPlugins = []
      const npmNames = ['undefined-keywords-plugin']

      install.mockResolvedValue({
        productionPackages : ['undefined-keywords-plugin']
      })

      view.mockResolvedValue({})

      await installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // Should log warning for package with undefined keywords
      expect(mockReporter.log).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Package 'undefined-keywords-plugin' does not have the 'pluggable-endpoints' keyword")
      )
    })

    test('verifies keywords for multiple packages', async() => {
      const installedPlugins = []
      const npmNames = ['plugin-a', 'plugin-b']

      install.mockResolvedValue({
        productionPackages : ['plugin-a', 'plugin-b']
      })

      view
        .mockResolvedValueOnce({ keywords : ['pluggable-endpoints'] })
        .mockResolvedValueOnce({ keywords : ['other-keyword'] })

      await installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })

      // Should verify both packages
      expect(view).toHaveBeenCalledTimes(2)
      expect(view).toHaveBeenCalledWith({ packageName : 'plugin-a' })
      expect(view).toHaveBeenCalledWith({ packageName : 'plugin-b' })

      // Should only warn about plugin-b
      expect(mockReporter.log).not.toHaveBeenCalledWith(
        expect.stringContaining("'plugin-a'")
      )
      expect(mockReporter.log).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Package 'plugin-b' does not have the 'pluggable-endpoints' keyword")
      )
    })
  })
})
