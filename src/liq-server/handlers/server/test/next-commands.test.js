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
    [ '', [ 'credentials', 'help', 'orgs', 'playground', 'server' ]],
    [ '/', [ 'credentials', 'help', 'orgs', 'playground', 'server' ]],
    [ '/o', [ 'orgs' ]],
    [ '/org', [ 'orgs' ]],
    [ '/orgs/', [ 'create', 'list', 'orgA' ]],
    [ '/orgs/li', [ 'list' ]],
    [ '/orgs/or', [ 'orgA' ]],
    [ '/orgs/list', [ 'list' ]],
    [ '/orgs/list ', [ '--' ]],
    // fields has a resolver
    [ '/orgs/list --', [ '--' ]],
    [ '/orgs/list -- ', [ 'fields=', 'format=', 'nesting=', 'noHeaders', 'output', 'output=', 'writeFileLocally' ]],
    [ '/orgs/list -- fields', [ 'fields=' ]],
    [ '/orgs/list -- fields=', [ 'commonName', 'key', 'legalName' ]],
    [ '/orgs/list -- fields=common', [ 'commonName' ]],
    [ '/orgs/list -- out', [ 'output', 'output=' ]],
    [ '/orgs/list -- output', [ 'output', 'output=' ]],
    // output does not have a resolver
    [ '/orgs/list -- output=', [ ]],
    [ '/orgs/list -- output=/users/foo/bar', [ ]],
    [ '/orgs/list -- output=/users/foo/bar ', [ 'fields=', 'format=', 'nesting=', 'noHeaders', 'writeFileLocally' ]],
    [ '/orgs/list -- noHeaders output=/users/foo/bar', [ ]],
    [ '/orgs/list -- noHeaders output=/users/foo/bar ', [ 'fields=', 'format=', 'nesting=', 'writeFileLocally' ]],
    [ '/orgs/list -- noHeaders', [ 'noHeaders' ]],
    [ '/orgs/list -- noHeaders ', [ 'fields=', 'format=', 'nesting=', 'output', 'output=', 'writeFileLocally' ]],
    [ '/orgs/orgA', [ 'orgA' ]],
    [ '/orgs/orgA/', [ 'projects', 'staff' ]],
    // uses the exclude setting to handle mutually exclusive parameters
    [ '/credentials/gitHubSSH/import -- leaveInPlace ', [ 'path=', 'replace' ]]
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
    test.each(testArray)("'%s' -> %p", async (command, nextCommands) => {
      const { body } = await request(app)
        .get('/server/next-commands') // it reads weird, but this MUST go first
        .query({ command })
        .set('Accept', 'application/json')
        
      expect(body).toEqual(nextCommands)
    })
  }
})
