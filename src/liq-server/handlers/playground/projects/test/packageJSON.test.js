/* global afterAll beforeAll describe expect jest test */
import request from 'supertest'

import { appInit } from '../../../../app'
import { model } from '../../../../model'
import { defaultTestOptions } from '../../../../test/lib/test-utils'
import projectA01PackageContents from '../../../../test/data/playground-simple/orgA/projectA01/package.json'

const logs = []
const testOptions = defaultTestOptions()
testOptions.reporter.log = jest.fn((msg) => { logs.push(msg) })
testOptions.reporter.error = testOptions.reporter.log
testOptions.logs = logs

describe('GET:/playground/projects/:localOrgKey/:localProjectName/packageJSON', () => {
  let app
  let cache
  
  beforeAll(() => {
    model.initialize(testOptions);
    ({ app, cache } = appInit(defaultTestOptions(Object.assign({ model }, testOptions))));
  })
  afterEach(() => { cache.release() /* cache has timers that must be stopped */ })
  
  test('will retrieve the local package definition', async () => {
    const { body, headers, status } = await request(app)
      .get('/playground/projects/orgA/projectA01/packageJSON') // it reads weird, but this MUST go first
      .set('Accept', 'application/json')
      
      expect(status).toBe(200)
      expect(headers['content-type']).toMatch(/application\/json/)
      expect(body).toBeTruthy()
      expect(body).toStrictEqual(projectA01PackageContents)
  })
})
