/* global afterAll beforeAll describe expect jest test */
import request from 'supertest'

import { appInit } from '../../../app'
import { model } from '../../../model'
import { CURR_VER, defaultTestOptions } from '../../../test/lib/test-utils'

describe('GET:/server/next-commands', () => {
  let app
  let cache
  beforeAll(() => {
    model.initialize(defaultTestOptions());
    ({ app, cache } = appInit(defaultTestOptions({ model })));
  })
  
  afterAll(() => { cache.release() })
  
  test.each([
    [ '/', [ 'orgs', 'server' ]],
    [ '/', [ 'orgs', 'server' ]],
    [ '/orgs', [ 'list', 'orgA' ]],
    [ '/orgs/list', [ '--' ]],
    [ '/orgs/list --', [ 'fields', 'format', 'noHeaders', 'output' ]],
    [ '/orgs/list -- fields', [ 'format', 'noHeaders', 'output' ]],
    [ '/orgs/orgA', [ 'staff' ]]
  ])('%s -> %p', async (command, nextCommands) => {
    const { status, body, headers } = await request(app)
      .get('/server/next-commands') // it reads weird, but this MUST go first
      .query({ command })
      .set('Accept', 'application/json')
      
      expect(body).toEqual(nextCommands)
  })
})
