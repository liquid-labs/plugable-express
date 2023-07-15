/* global afterAll beforeAll describe expect test */
import request from 'supertest'

import { appInit } from '../../../app'
import { initModel } from '../../../model'
import { CURR_VER, defaultTestOptions } from '../../../test/lib/test-utils'

const testOptions = defaultTestOptions()

describe('GET:/server', () => {
  let app, cache, model
  beforeAll(async() => {
    process.env.LIQ_PLAYGROUND = testOptions.LIQ_PLAYGROUND_PATH
    model = initModel(testOptions);
    ({ app, cache } = await appInit(defaultTestOptions({ model, noAPIUpdate : true })))
  })

  afterAll(() => { cache?.release() })

  test('processes JSON requests', async() => {
    const { status, body, headers } = await request(app)
      .get('/server') // it reads weird, but this MUST go first
      .set('Accept', 'application/json')
    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/json/)
    expect(body.server).toBe(CURR_VER)
  })

  test('processes plain text requests', async() => {
    const { status, text, headers } = await request(app)
      .get('/server') // it reads weird, but this MUST go first
      .set('Accept', 'text/plain')
    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/text\/plain/)
    expect(text).toMatch(new RegExp(`liq-server: ${CURR_VER}`))
  })

  test('results in a 406 with unsupported accept types', async() => {
    const { status } = await request(app)
      .get('/server') // it reads weird, but this MUST go first
      .set('Accept', 'application/xml')

    expect(status).toBe(406)
  })
})
