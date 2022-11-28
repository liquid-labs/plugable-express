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
  
  const testArrayUrl = [
    [ '', [ 'orgs', 'playground', 'server' ]],
    [ '/', [ 'orgs', 'playground', 'server' ]],
    [ '/orgs', [ 'list', 'orgA' ]],
    [ '/orgs/list', [ '--' ]],
    [ '/orgs/list --', [ 'fields', 'format', 'noHeaders', 'output' ]],
    [ '/orgs/list -- fields', [ 'format', 'noHeaders', 'output' ]],
    [ '/orgs/orgA', [ 'staff' ]]
  ]
  const testArrayCli = testArrayUrl.map((r) => {
    let cliCmd = r[0]
    if (!cliCmd.match(/^\s*$/)) {
      cliCmd = cliCmd.slice(1).replaceAll('/', ' ')
    }
    
    return [ cliCmd, r[1]]
  })
  
  for (const testArray of [ testArrayUrl, testArrayCli ]) {
    test.each(testArray)('%s -> %p', async (command, nextCommands) => {
      const { status, body, headers } = await request(app)
        .get('/server/next-commands') // it reads weird, but this MUST go first
        .query({ command })
        .set('Accept', 'application/json')
        
      expect(body).toEqual(nextCommands)
    })
  }
})
