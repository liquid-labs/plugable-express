/* global afterAll beforeAll describe expect jest test */
import request from 'supertest'

import { appInit } from '../../../app'
import { model } from '../../../model'
import { defaultTestOptions } from '../../../test/lib/test-utils'

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
    // fields has a resolver
    [ '/orgs/list --', [ 'fields=', 'format=', 'noHeaders', 'output', 'output=', 'writeFileLocally' ]],
    [ '/orgs/list -- fields', [ 'fields=' ]],
    [ '/orgs/list -- fields=', [ 'commonName', 'key', 'legalName' ]],
    [ '/orgs/list -- out', [ 'output', 'output=' ]],
    [ '/orgs/list -- output', [ 'output', 'output=' ]],
    // output does not have a resolver
    [ '/orgs/list -- output=', [ ]],
    [ '/orgs/list -- output=/users/foo/bar', [ 'fields=', 'format=', 'noHeaders', 'writeFileLocally' ]],
    [ '/orgs/list -- noHeaders output=/users/foo/bar', [ 'fields=', 'format=', 'writeFileLocally' ]],
    [ '/orgs/list -- noHeaders', [ 'fields=', 'format=', 'output', 'output=', 'writeFileLocally' ]],
    [ '/orgs/list -- noHeaders ', [ 'fields=', 'format=', 'output', 'output=', 'writeFileLocally' ]],
    [ '/orgs/orgA', [ 'staff' ]]
  ]
  const testArrayCli = testArrayUrl.map((r) => {
    const hasSep = r[0].match(/ --/)
    let [ cmdPath, options ] = r[0].split('--')
    if (!cmdPath.match(/^\s*$/)) {
      cmdPath = cmdPath.slice(1).replaceAll('/', ' ')
    }
    let cliPath = cmdPath
    if (hasSep) cliPath += '--'
    if (options) cliPath += options
    return [ cliPath, r[1]]
  })
  
  for (const testArray of [ testArrayUrl, testArrayCli ]) {
    test.each(testArray)('%s -> %p', async (command, nextCommands) => {
      const { body } = await request(app)
        .get('/server/next-commands') // it reads weird, but this MUST go first
        .query({ command })
        .set('Accept', 'application/json')
        
      expect(body).toEqual(nextCommands)
    })
  }
})
