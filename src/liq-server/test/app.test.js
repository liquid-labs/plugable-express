/* global afterAll beforeAll describe expect jest test */
import * as path from 'path'
import request from 'supertest'

import { appInit } from '../app'
import { model } from '../model'
import { defaultTestOptions } from './lib/test-utils'
import { fooOutput } from './data/plugins/foo'

const COMMAND_COUNT = 10

const projectA01Package = {
  name        : '@orgA/projectA01',
  version     : '1.0.0',
  description : 'Test data',
  scripts     : {
    test : 'echo "Error: no test specified" && exit 1'
  },
  author  : 'Zane Rockenbaugh <zane@liquid-labs.com>',
  license : 'UNLICENSED'
}

const origLog = defaultTestOptions.reporter.log
const logs = []
const mockLog = () => {
  logs.length = 0
  defaultTestOptions.reporter.log = jest.fn((msg) => { logs.push(msg) })
}
const unmockLog = () => { defaultTestOptions.reporter.log = origLog }

describe('app', () => {
  describe('default setup provides useful info', () => {
    beforeAll(() => {
      mockLog()
      model.initialize(defaultTestOptions)
      appInit(Object.assign({ model }, defaultTestOptions))
    })

    // Need to clean up a few things.
    afterAll(unmockLog)

    test('describes registered paths', () => {
      expect(logs.filter((msg) =>
        // re: '[A-Z]:' matches the verb  v      v always start with a slash
        //                                          v regular path elements with optional ':', indicating it's a param
        //                                                            v or it's an RE as indicated by a closing '/'
        msg.match(/registering handler.+[A-Z]+:\/((:?[a-zA-Z0-9/-])*|.*[/])$/)).length)
        .toEqual(COMMAND_COUNT)
    })

    // TODO: use http.METHODS to verify that all registered paths used known verbs
  })

  describe('plugins', () => {
    let app
    beforeAll(() => {
      mockLog()
      model.initialize(defaultTestOptions)
      app = appInit(Object.assign({}, defaultTestOptions,
        {
          model,
          force         : true,
          pluginOptions : {
            // Note, 'findPlugins' starts looking at directories under the dir and doesn't look in dir itself
            dir         : path.join(__dirname, 'data', 'plugins'),
            scanAllDirs : true,
            excludeDependencies: undefined,
            includeOptional: undefined
          },
          skipPlugins : false
        })
      )
    })
    afterAll(unmockLog)

    test('registers the new plugin', () => {
      expect(logs.filter((msg) =>
        msg.match(/registering handler.+[A-Z]+:\/((:?[a-zA-Z0-9/-])*|.*[/])$/)).length)
        .toEqual(COMMAND_COUNT + 1)
    })

    test('can be loaded dynamically', async() => {
      const { status, body } = await request(app).get('/foo')
      expect(status).toBe(200)
      expect(body).toEqual(fooOutput)
    })
  })

  // TODO: this should move (which will break it up, but OK) to the individual handler dirs to keep tests near the target.
  describe('response testing', () => {
    let app
    beforeAll(() => {
      model.initialize(defaultTestOptions)
      app = appInit(Object.assign({ model }, defaultTestOptions))
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
