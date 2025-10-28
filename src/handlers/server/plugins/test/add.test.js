/* global beforeEach describe expect jest test */

import { httpSmartResponse } from '@liquid-labs/http-smart-response'

// Import the module under test
import { func, help, method, parameters, path, installPlugins } from '../add'

// Mock dependencies
jest.mock('@liquid-labs/http-smart-response')
jest.mock('../_lib/install-plugins')

describe('add plugin handler', () => {
  let mockApp
  let mockReporter
  let mockReq
  let mockRes

  beforeEach(() => {
    jest.clearAllMocks()

    mockApp = {
      ext : {
        handlerPlugins : [
          { npmName : 'existing-plugin' }
        ],
        pluginsPath : '/test/plugins'
      },
      reload : jest.fn().mockReturnValue(Promise.resolve())
    }

    mockReporter = { log : jest.fn() }

    mockReq = {
      vars : {
        npmNames : ['new-plugin']
      }
    }

    mockRes = {}

    installPlugins.mockResolvedValue({
      msg  : 'Installation complete',
      data : {
        installedPlugins : [],
        total            : 0,
        production       : 0
      }
    })
    httpSmartResponse.mockImplementation(() => {})
  })

  describe('metadata', () => {
    test('exports correct metadata', () => {
      expect(help.name).toBe('add server plugins')
      expect(help.summary).toBe('Installs one or more server plugins.')
      expect(method).toBe('put')
      expect(path).toEqual(['server', 'plugins', 'add'])
    })

    test('includes npmNames parameter', () => {
      const npmNamesParam = parameters.find(p => p.name === 'npmNames')
      expect(npmNamesParam).toBeDefined()
      expect(npmNamesParam.isMultivalue).toBe(true)
      expect(npmNamesParam.description).toContain('pluggable-endpoints')
    })

    test('does not include noImplicitInstallation parameter', () => {
      const noImplicitParam = parameters.find(p => p.name === 'noImplicitInstallation')
      expect(noImplicitParam).toBeUndefined()
    })
  })

  describe('func', () => {
    test('calls installPlugins with correct parameters', async() => {
      const handler = func({ app : mockApp, reporter : mockReporter })
      await handler(mockReq, mockRes)

      expect(installPlugins).toHaveBeenCalledWith({
        installedPlugins : [{ npmName : 'existing-plugin' }],
        npmNames         : ['new-plugin'],
        pluginPkgDir     : '/test/plugins',
        reloadFunc       : expect.any(Function),
        reporter         : mockReporter
      })
    })

    test('uses process.cwd() when pluginsPath is not provided', async() => {
      mockApp.ext.pluginsPath = undefined

      const handler = func({ app : mockApp, reporter : mockReporter })
      await handler(mockReq, mockRes)

      expect(installPlugins).toHaveBeenCalledWith({
        installedPlugins : [{ npmName : 'existing-plugin' }],
        npmNames         : ['new-plugin'],
        pluginPkgDir     : process.cwd(),
        reloadFunc       : expect.any(Function),
        reporter         : mockReporter
      })
    })

    test('uses process.cwd() when pluginsPath is null', async() => {
      mockApp.ext.pluginsPath = null

      const handler = func({ app : mockApp, reporter : mockReporter })
      await handler(mockReq, mockRes)

      expect(installPlugins).toHaveBeenCalledWith({
        installedPlugins : [{ npmName : 'existing-plugin' }],
        npmNames         : ['new-plugin'],
        pluginPkgDir     : process.cwd(),
        reloadFunc       : expect.any(Function),
        reporter         : mockReporter
      })
    })

    test('calls httpSmartResponse with result', async() => {
      const handler = func({ app : mockApp, reporter : mockReporter })
      await handler(mockReq, mockRes)

      expect(httpSmartResponse).toHaveBeenCalledWith({
        data : {
          installedPlugins : [],
          total            : 0,
          production       : 0
        },
        msg : 'Installation complete',
        req : mockReq,
        res : mockRes
      })
    })

    test('reloadFunc calls app.reload()', async() => {
      const handler = func({ app : mockApp, reporter : mockReporter })
      await handler(mockReq, mockRes)

      // Get the reloadFunc that was passed to installPlugins
      const reloadFunc = installPlugins.mock.calls[0][0].reloadFunc
      await reloadFunc()

      expect(mockApp.reload).toHaveBeenCalled()
    })

    test('handles empty handlerPlugins array', async() => {
      mockApp.ext.handlerPlugins = undefined

      const handler = func({ app : mockApp, reporter : mockReporter })
      await handler(mockReq, mockRes)

      expect(installPlugins).toHaveBeenCalledWith({
        installedPlugins : [],
        npmNames         : ['new-plugin'],
        pluginPkgDir     : '/test/plugins',
        reloadFunc       : expect.any(Function),
        reporter         : mockReporter
      })
    })

    test('handles multiple packages', async() => {
      mockReq.vars.npmNames = ['plugin1', 'plugin2', 'plugin3']

      const handler = func({ app : mockApp, reporter : mockReporter })
      await handler(mockReq, mockRes)

      expect(installPlugins).toHaveBeenCalledWith({
        installedPlugins : [{ npmName : 'existing-plugin' }],
        npmNames         : ['plugin1', 'plugin2', 'plugin3'],
        pluginPkgDir     : '/test/plugins',
        reloadFunc       : expect.any(Function),
        reporter         : mockReporter
      })
    })
  })
})
