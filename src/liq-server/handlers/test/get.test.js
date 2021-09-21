/* global afterAll beforeAll describe expect jest test */
import request from 'supertest'

import { app, model, initApp, CURR_VER } from '../../test/lib/init-app'

describe('GET:/', () => {
  beforeAll(initApp)
  
  test("processes JSON requests", async() => {
    const { status, body, headers } = await request(app)
      .get('/') // it reads weird, but this MUST go first
      .set('Accept', 'application/json')

    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/json/)
    expect(body.server).toBe(CURR_VER)
  })
  
  test("processes plain text requests", async() => {
    const { status, text, headers } = await request(app)
      .get('/') // it reads weird, but this MUST go first
      .set('Accept', 'text/plain')

    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/text\/plain/)
    expect(text).toMatch(new RegExp(`liq-server: ${CURR_VER}`))
  })
  
  test("results in a 406 with unsupported accept types", async() => {
    const { status } = await request(app)
      .get('/') // it reads weird, but this MUST go first
      .set('Accept', 'application/xml')

    expect(status).toBe(406)
  })
})
