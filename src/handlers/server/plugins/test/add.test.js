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
        implied          : 0,
        local            : 0,
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

    test('includes noImplicitInstallation parameter', () => {
      const noImplicitParam = parameters.find(p => p.name === 'noImplicitInstallation')
      expect(noImplicitParam).toBeDefined()
      expect(noImplicitParam.isBoolean).toBe(true)
      expect(noImplicitParam.description).toContain('implicit plugin dependencies')
    })

    test('includes npmNames parameter', () => {
      const npmNamesParam = parameters.find(p => p.name === 'npmNames')
      expect(npmNamesParam).toBeDefined()
      expect(npmNamesParam.isMultivalue).toBe(true)
    })
  })

  describe('func', () => {
    test('calls installPlugins with correct parameters when noImplicitInstallation is true', async() => {
      mockReq.vars.noImplicitInstallation = true

      const handler = func({ app : mockApp, reporter : mockReporter })
      await handler(mockReq, mockRes)

      expect(installPlugins).toHaveBeenCalledWith({
        app                    : mockApp,
        installedPlugins       : [{ npmName : 'existing-plugin' }],
        noImplicitInstallation : true,
        npmNames               : ['new-plugin'],
        pluginPkgDir           : '/test/plugins',
        reloadFunc             : expect.any(Function),
        reporter               : mockReporter
      })
    })

    test('calls installPlugins with correct parameters when noImplicitInstallation is false', async() => {
      mockReq.vars.noImplicitInstallation = false

      const handler = func({ app : mockApp, reporter : mockReporter })
      await handler(mockReq, mockRes)

      expect(installPlugins).toHaveBeenCalledWith({
        app                    : mockApp,
        installedPlugins       : [{ npmName : 'existing-plugin' }],
        noImplicitInstallation : false,
        npmNames               : ['new-plugin'],
        pluginPkgDir           : '/test/plugins',
        reloadFunc             : expect.any(Function),
        reporter               : mockReporter
      })
    })

    test('calls installPlugins with undefined noImplicitInstallation when not provided', async() => {
      // noImplicitInstallation not in req.vars

      const handler = func({ app : mockApp, reporter : mockReporter })
      await handler(mockReq, mockRes)

      expect(installPlugins).toHaveBeenCalledWith({
        app                    : mockApp,
        installedPlugins       : [{ npmName : 'existing-plugin' }],
        noImplicitInstallation : undefined,
        npmNames               : ['new-plugin'],
        pluginPkgDir           : '/test/plugins',
        reloadFunc             : expect.any(Function),
        reporter               : mockReporter
      })
    })

    test('calls httpSmartResponse with result', async() => {
      const handler = func({ app : mockApp, reporter : mockReporter })
      await handler(mockReq, mockRes)

      expect(httpSmartResponse).toHaveBeenCalledWith({
        data : {
          installedPlugins : [],
          total            : 0,
          implied          : 0,
          local            : 0,
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
      await reloadFunc({ app : mockApp })

      expect(mockApp.reload).toHaveBeenCalled()
    })

    test('handles empty handlerPlugins array', async() => {
      mockApp.ext.handlerPlugins = undefined

      const handler = func({ app : mockApp, reporter : mockReporter })
      await handler(mockReq, mockRes)

      expect(installPlugins).toHaveBeenCalledWith({
        app                    : mockApp,
        installedPlugins       : [],
        noImplicitInstallation : undefined,
        npmNames               : ['new-plugin'],
        pluginPkgDir           : '/test/plugins',
        reloadFunc             : expect.any(Function),
        reporter               : mockReporter
      })
    })
  })
})
