/* global beforeEach describe expect jest test */

import { installPlugins, checkMaxPackages } from '../install-plugins'

import * as fs from 'node:fs/promises'
import { install } from '@liquid-labs/npm-toolkit'
import { PluginError } from '../error-utils'

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

describe('install-plugins-errors', () => {
  let mockReporter
  let mockReloadFunc

  beforeEach(() => {
    jest.clearAllMocks()

    mockReporter = { log : jest.fn() }
    mockReloadFunc = jest.fn().mockReturnValue(Promise.resolve())

    fs.mkdir.mockResolvedValue()
  })

  describe('error handling', () => {
    test('handles installation errors', async() => {
      const installedPlugins = []
      const npmNames = ['failing-plugin']

      install.mockRejectedValue(new Error('Installation failed'))

      await expect(installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })).rejects.toThrow('Installation failed')
    })

    test('handles mkdir errors', async() => {
      const installedPlugins = []
      const npmNames = ['test-plugin']

      fs.mkdir.mockRejectedValue(new Error('Permission denied'))

      await expect(installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : mockReloadFunc,
        reporter     : mockReporter
      })).rejects.toThrow('Permission denied')
    })

    test('checkMaxPackages accepts count below limit', () => {
      expect(() => checkMaxPackages(100)).not.toThrow()
      expect(() => checkMaxPackages(500)).not.toThrow()
    })

    test('checkMaxPackages throws for count above limit', () => {
      expect(() => checkMaxPackages(501)).toThrow()
      expect(PluginError.resourceLimit).toHaveBeenCalledWith('packages', 501, 500)
    })

    test('handles async reload function errors', async() => {
      const installedPlugins = []
      const npmNames = ['test-plugin']

      install.mockResolvedValue({
        productionPackages : ['test-plugin']
      })

      const failingReload = jest.fn().mockRejectedValue(new Error('Reload failed'))

      await expect(installPlugins({
        installedPlugins,
        npmNames,
        pluginPkgDir : '/plugins',
        reloadFunc   : failingReload,
        reporter     : mockReporter
      })).rejects.toThrow('Reload failed')
    })
  })
})
