/* global afterAll beforeAll describe expect jest test */
import * as path from 'path'
import request from 'supertest'

import { finalizeTestData, pluginsPath } from '@liquid-labs/liq-test-lib'

import { appInit } from '../app'
import { COMMAND_COUNT, defaultTestOptions } from './lib/test-utils'

const fooPath = path.join(pluginsPath, 'node_modules', 'foo')

const mockLogOptions = () => {
  const logs = []
  const options = defaultTestOptions()

  options.reporter.log = jest.fn((msg) => { logs.push(msg) })
  options.logs = logs

  return options
}

const registrationRegExp = /^registering handler for path: [A-Z]+:/

describe('app', () => {
  beforeAll(finalizeTestData)

  describe('default setup provides useful info', () => {
    const testOptions = mockLogOptions()
    let cache

    beforeAll(async() => {
      ({ cache } = await appInit(Object.assign(testOptions, { noAPIUpdate : true, noRegistries : true })))
    })

    afterAll(() => {
      delete process.env.LIQ_PLAYGROUND
      cache.release()
    })

    test('describes registered paths', () => {
      expect(testOptions.logs.filter((msg) =>
        // re: '[A-Z]:' matches the verb  v      v always start with a slash
        //                                          v regular path elements with optional ':', indicating it's a param
        //                                                            v or it's an RE as indicated by a closing '/'
        msg.match(registrationRegExp)).length)
        .toEqual(COMMAND_COUNT)
    })

    // TODO: use http.METHODS to verify that all registered paths used known verbs
  })

  describe('custom plugins', () => {
    let app, cache
    const testOptions = mockLogOptions()

    beforeAll(async() => {
      testOptions.pluginPaths = [pluginsPath]
      testOptions.noAPIUpdate = true
      testOptions.skipCorePlugins = false;
      ({ app, cache } = await appInit(Object.assign(testOptions, { noAPIUpdate : true, noRegistries : true })))
    })

    afterAll(() => {
      delete process.env.LIQ_PLAYGROUND
      cache.release()
    })

    test('are registered', () => {
      expect(testOptions.logs.filter((msg) =>
        msg.match(registrationRegExp)).length)
        .toEqual(COMMAND_COUNT + 1)
    })

    test('can be called', async() => {
      const { fooOutput } = await import(fooPath)
      const { status, body } = await request(app).get('/foo')
      expect(status).toBe(200)
      expect(body).toEqual(fooOutput)
    })

    test('discovers plugins from node_modules (not just package.json dependencies)', () => {
      // The 'foo' plugin is located in node_modules/foo/, demonstrating that
      // the discovery mechanism scans node_modules recursively using find-plugins,
      // not just reading dependencies from package.json
      const fooPlugin = app.ext.handlerPlugins.find(p => p.npmName === 'foo')
      expect(fooPlugin).toBeDefined()
      expect(fooPlugin.npmName).toBe('foo')
      expect(fooPlugin.version).toBe('1.0.0')
    })
  })

  describe('explicit plugins', () => {
    let app, cache
    const testOptions = mockLogOptions()

    beforeAll(async() => {
      testOptions.pluginPaths = [pluginsPath]
      testOptions.explicitPlugins = ['foo']
      testOptions.noAPIUpdate = true
      testOptions.skipCorePlugins = false;
      ({ app, cache } = await appInit(Object.assign(testOptions, { noAPIUpdate : true, noRegistries : true })))
    })

    afterAll(() => {
      delete process.env.LIQ_PLAYGROUND
      cache.release()
    })

    test('loads explicitly specified plugins', () => {
      const fooPlugin = app.ext.handlerPlugins.find(p => p.npmName === 'foo')
      expect(fooPlugin).toBeDefined()
      expect(fooPlugin.npmName).toBe('foo')
    })

    test('logs search for explicitly specified plugins', () => {
      const explicitPluginLogs = testOptions.logs.filter((msg) =>
        msg.includes('explicitly specified plugins'))
      expect(explicitPluginLogs.length).toBeGreaterThan(0)
    })

    test('loads explicit plugins only once (no duplicates)', () => {
      // 'foo' has the keyword AND is explicitly specified, but should only be loaded once
      const fooPluginCount = app.ext.handlerPlugins.filter(p => p.npmName === 'foo').length
      expect(fooPluginCount).toBe(1) // Should only be loaded once despite matching both criteria
    })

    test('can call endpoints from explicitly loaded plugins', async() => {
      const { fooOutput } = await import(fooPath)
      const { status, body } = await request(app).get('/foo')
      expect(status).toBe(200)
      expect(body).toEqual(fooOutput)
    })
  })
})
