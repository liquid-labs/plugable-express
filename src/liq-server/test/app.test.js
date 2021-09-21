/* global afterAll beforeAll describe expect jest test */
import request from 'supertest'

import { app, model, initApp } from './lib/init-app'
import { reporter, simplePlaygroundPath } from './lib/test-utils'

const COMMAND_COUNT=7

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

describe('app', () => {
  describe('default setup provides useful info', () => {
    const consoleLog = console.log
    const logs = []
    let appInitialized = undefined

    beforeAll(() => {
      appInitialized = app.initialized
      model.initialize({
        LIQ_PLAYGROUND_PATH : simplePlaygroundPath,
        reporter
      })
      console.log = jest.fn((msg) => { logs.push(msg) })
      app.initialize({ model })
    })

    // Need to clean up a few things.
    afterAll(() => {
      console.log = consoleLog
      
      if (appInitialized) { // then we need to reset it
        initApp({ force: true })
      }
    })

    test('describes registered paths', () => {
      expect(logs.filter((msg) =>
        // re: '[A-Z]:' matches the verb  v      v always start with a slash
        //                                          v regular path elements with optional ':', indicating it's a param
        //                                                            v or it's an RE as indicated by a closing '/'
        msg.match(/registering handler.+[A-Z]+:\/((:?[a-zA-Z0-9/-])*|.*[/])$/)).length)
        .toBe(COMMAND_COUNT)
    })

    // TODO: use http.METHODS to verify that all registered paths used known verbs
  })
  
  // TODO: this should move (which will break it up, but OK) to the individual handler dirs to keep tests near the target.
  describe('response testing', () => {
    beforeAll(initApp)

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
