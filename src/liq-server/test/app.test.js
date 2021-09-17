/* global beforeAll describe expect test */
import request from 'supertest'

import { app } from '../app'
import { model } from '../model'
import { reporter, simplePlaygroundPath } from './test-utils'

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
    
    beforeAll(() => {
      model.initialize({
        LIQ_PLAYGROUND_PATH : simplePlaygroundPath,
        reporter
      })
      console.log = jest.fn((msg) => { logs.push(msg) })
      app.initialize({ model })
    })
    
    afterAll(() => {
      console.log = consoleLog
    })
    
    test('describes registered paths', () => {
      expect(logs.filter((msg) =>
        msg.match(/registering handler.+[A-Z]+:\/[a-zA-Z0-9/-]*$/)).length)
        .toBe(6)
    })
    
    // TODO: use http.METHODS to verify that all registered paths used known verbs
  })
  
  describe('response testing', () => {
    beforeAll(() => {
      model.initialize({
        LIQ_PLAYGROUND_PATH : simplePlaygroundPath,
        reporter
      })
      app.initialize({ model, reporter })
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
