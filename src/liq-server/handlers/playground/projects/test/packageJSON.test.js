/* global afterAll beforeAll describe expect jest test */
import * as fsPath from 'node:path'
import { readFileSync } from 'node:fs'

import request from 'supertest'

import { playgroundSimplePath } from '@liquid-labs/liq-test-lib'

import { appInit } from '../../../../app'
import { initModel } from '../../../../model'
import { defaultTestOptions } from '../../../../test/lib/test-utils'

const projectA01PackagePath = fsPath.join(playgroundSimplePath, 'orgA', 'projectA01', 'package.json')
const projectA01PackageContents = readFileSync(projectA01PackagePath, { encoding: 'utf8' })
const projectA01Package = JSON.parse(projectA01PackageContents)

const logs = []
const testOptions = defaultTestOptions()
testOptions.reporter.log = jest.fn((msg) => { logs.push(msg) })
testOptions.reporter.error = testOptions.reporter.log
testOptions.logs = logs

describe('GET:/playground/projects/:orgKey/:localProjectName/packageJSON', () => {
  let app, cache, model

  beforeAll(async() => {
    process.env.LIQ_PLAYGROUND = testOptions.LIQ_PLAYGROUND_PATH
    model = initModel(testOptions);
    ({ app, cache } = await appInit(defaultTestOptions(Object.assign({ model }, testOptions))))
  })
  afterAll(() => {
    delete process.env.LIQ_PLAYGROUND
    cache.release() /* cache has timers that must be stopped */
  })

  test('will retrieve the local package definition', async() => {
    const { body, headers, status } = await request(app)
      .get('/playground/projects/orgA/projectA01/packageJSON') // it reads weird, but this MUST go first
      .set('Accept', 'application/json')

    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/application\/json/)
    expect(body).toBeTruthy()
    expect(body).toStrictEqual(projectA01Package)
  })
})
