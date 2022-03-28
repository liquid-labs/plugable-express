/* global beforeAll describe expect jest test */
import * as path from 'path'
import request from 'supertest'

import { appInit } from '../app'
import { model } from '../model'
import { defaultTestOptions } from './lib/test-utils'
import { fooOutput } from './data/plugins/node_modules/foo'
import projectA01Package from './data/playground-simple/orgA/projectA01/package.json'

const COMMAND_COUNT = 13

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

    beforeAll(() => {
      model.initialize(testOptions)
      appInit(Object.assign(testOptions, { model }))
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
    let app
    const testOptions = mockLogOptions()

    beforeAll(() => {
      model.initialize(testOptions)
      testOptions.pluginPath = path.join(__dirname, 'data', 'plugins')
      testOptions.skipCorePlugins = false
      app = appInit(testOptions)
    })

    test('are registered', () => {
      expect(testOptions.logs.filter((msg) =>
        msg.match(registrationRegExp)).length)
        .toEqual(COMMAND_COUNT + 1)
    })

    test('can be called', async() => {
      const { status, body } = await request(app).get('/foo')
      expect(status).toBe(200)
      expect(body).toEqual(fooOutput)
    })
  })

  // TODO: this should move (which will break it up, but OK) to the individual handler dirs to keep tests near the target.
  describe('response testing', () => {
    let app
    beforeAll(() => {
      const testOptions = mockLogOptions()
      model.initialize(testOptions)
      app = appInit(Object.assign(testOptions, { model }))
    })

    test.each`
    path | result
    ${'/playground/projects/orgA/projectA01/packageJSON'} | ${projectA01Package}
    ${'/playground/orgs/orgA/projects/projectA01/packageJSON'} | ${projectA01Package}
    `("'GET $path' gets the package.json contents", async({ path, result }) => {
      const { status, body } = await request(app).get(path)
      expect(status).toBe(200)
      expect(body).toEqual(result)
    })
  })
})
