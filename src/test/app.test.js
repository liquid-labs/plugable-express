/* global afterAll beforeAll describe expect jest test */
import * as path from 'path'
import request from 'supertest'

import { pluginsPath } from '@liquid-labs/liq-test-lib'

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
      process.env.LIQ_PLAYGROUND = testOptions.LIQ_PLAYGROUND_PATH
      testOptions.dynamicPluginInstallDir = pluginsPath
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
  })
})
