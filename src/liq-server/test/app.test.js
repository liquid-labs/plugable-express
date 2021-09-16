/* global beforeAll describe expect test */
import * as fs from 'fs'
import request from 'supertest'

import { app } from '../app'
import { model } from '../model'
import { reporter, simplePlaygroundPath } from './test-utils'

const projectA01Package = {
  "name": "@orgA/projectA01",
  "version": "1.0.0",
  "description": "Test data",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "Zane Rockenbaugh <zane@liquid-labs.com>",
  "license": "UNLICENSED"
}

describe('app', () => {
  beforeAll(() => {
    model.initialize({
      LIQ_PLAYGROUND_PATH: simplePlaygroundPath,
      reporter
    })
    app.initialize({ model, reporter })
  })
  
  test.each`
  path | result
  ${'/playground/projects/orgA/projectA01/packageJSON'} | ${projectA01Package}
  ${'/playground/orgs/orgA/projects/projectA01/packageJSON'} | ${projectA01Package}
  `("'GET $path' gets the package.json contents", async ({ path, result }) => {
    const { status, body } = await request(app).get(path)
    expect(status).toBe(200)
    expect(body).toEqual(result)
  })
})
