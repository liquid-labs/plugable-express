/* global afterAll beforeAll describe expect jest test */
import request from 'supertest'

import { appInit } from '../../../app'
import { model } from '../../../model'
import { COMMAND_COUNT, defaultTestOptions } from '../../../test/lib/test-utils'

describe('GET:/server/api', () => {
  let app
  let cache
  beforeAll(() => {
    model.initialize(defaultTestOptions());
    ({ app, cache } = appInit(defaultTestOptions({ model })));
  })
  
  afterAll(() => { cache.release() })
  
  test("returns a description of the API", async() => {
    const { status, body, headers } = await request(app)
      .get('/server/api') // it reads weird, but this MUST go first
      .set('Accept', 'application/json')
    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/json/)
    expect(body.length).toBe(COMMAND_COUNT)
  })
})
