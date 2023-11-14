/* global afterAll beforeAll describe expect test */
import request from 'supertest'

import { appInit } from '../../../app'
import { defaultTestOptions } from '../../../test/lib/test-utils'

const testOptions = defaultTestOptions()

describe('GET:/server/next-commands', () => {
  let app, cache

  beforeAll(async() => {
    process.env.LIQ_PLAYGROUND = testOptions.LIQ_PLAYGROUND_PATH;
    ({ app, cache } = await appInit(defaultTestOptions({ noAPIUpdate : true, noRegistries : true })))
  })

  afterAll(() => { cache?.release() })

  const testArrayUrl = [
    ['', ['heartbeat', 'help', 'server']],
    ['/', ['heartbeat', 'help', 'server']],
    ['/s', ['server']],
    ['/serve', ['server']],
    ['/server/', ['api', 'errors', 'next-commands', 'plugins', 'reload', 'stop', 'version']],
    ['/server/er', ['errors']],
    ['/server/errors', ['errors']],
    ['/server/errors/', ['list']],
    ['/server/errors/list ', ['--']],
    // fields has a resolver
    ['/server/errors/list --', ['--']],
    ['/server/errors/list -- ',
      ['fields=', 'format=', 'nesting=', 'noHeaders', 'output', 'output=', 'writeFileLocally']],
    ['/server/errors/list -- fields', ['fields=']],
    ['/server/errors/list -- fields=', ['id', 'message', 'protected', 'stack', 'timestamp']],
    ['/server/errors/list -- fields=me', ['message']],
    ['/server/errors/list -- out', ['output', 'output=']],
    ['/server/errors/list -- output', ['output', 'output=']],
    // output does not have a resolver
    ['/server/errors/list -- output=', []],
    ['/server/errors/list -- output=/users/foo/bar', []],
    ['/server/errors/list -- output=/users/foo/bar ',
      ['fields=', 'format=', 'nesting=', 'noHeaders', 'writeFileLocally']],
    ['/server/errors/list -- noHeaders output=/users/foo/bar', []],
    ['/server/errors/list -- noHeaders output=/users/foo/bar ', ['fields=', 'format=', 'nesting=', 'writeFileLocally']],
    ['/server/errors/list -- noHeaders', ['noHeaders']],
    ['/server/errors/list -- noHeaders ', ['fields=', 'format=', 'nesting=', 'output', 'output=', 'writeFileLocally']]
    // uses the exclude setting to handle mutually exclusive parameters
    // TODO: find another example in the core endpoints
    // ['/credentials/gitHubSSH/import -- leaveInPlace ', ['copyToStorage', 'path=', 'replace']]
  ]
  const testArrayCli = testArrayUrl.map((r) => {
    const hasSep = r[0].match(/ --/)
    let [cmdPath, options] = r[0].split('--')
    if (!cmdPath.match(/^\s*$/)) {
      cmdPath = 'cli-command ' + cmdPath.slice(1).replaceAll('/', ' ')
    }
    let cliPath = cmdPath
    if (hasSep) cliPath += '--'
    if (options) cliPath += options
    return [cliPath, r[1]]
  })

  for (const testArray of [testArrayUrl, testArrayCli]) {
    test.each(testArray)("'%s' -> %p", async(command, nextCommands) => {
      const { body } = await request(app)
        .get('/server/next-commands') // it reads weird, but this MUST go first
        .query({ command })
        .set('Accept', 'application/json')

      expect(body).toEqual(nextCommands)
    })
  }
})
