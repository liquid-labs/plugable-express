/* global afterAll beforeAll describe expect test */
import request from 'supertest'

import { appInit } from '../../../app'
import { CURR_VER, defaultTestOptions } from '../../../test/lib/test-utils'

describe('GET:/server', () => {
  let app, cache
  beforeAll(async() => {
    ({ app, cache } = await appInit(defaultTestOptions({ 
      name: 'pluggable-test', 
      noAPIUpdate : true, 
      version: '1.1-test.0' 
    })))
  })

  afterAll(() => { cache?.release() })

  test('processes JSON requests', async() => {
    const { status, body, headers } = await request(app)
      .get('/server') // it reads weird, but this MUST go first
      .set('Accept', 'application/json')
    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/json/)
    expect(body['plugable-express']).toBe(CURR_VER)
    expect(body.version).toBe('1.1-test.0')
  })

  test('processes plain text requests', async() => {
    const { status, text, headers } = await request(app)
      .get('/server') // it reads weird, but this MUST go first
      .set('Accept', 'text/plain')
    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/text\/plain/)
    expect(text).toMatch(new RegExp(`pluggable-test: 1.1-test.0`))
  })

  test('results in a 406 with unsupported accept types', async() => {
    const { status } = await request(app)
      .get('/server') // it reads weird, but this MUST go first
      .set('Accept', 'application/xml')

    expect(status).toBe(406)
  })
})
