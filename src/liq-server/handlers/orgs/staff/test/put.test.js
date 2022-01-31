/* global afterAll beforeAll describe expect jest test */
import * as fs from 'fs'
import * as path from 'path'
import request from 'supertest'

import { appInit } from '../../../../app'
import { model } from '../../../../model'
import { CURR_VER, defaultTestOptions } from '../../../../test/lib/test-utils'

const origStaffJSON = path.join(__dirname, '..', '..', '..', '..', '..',
  'src', 'liq-server', 'test', 'data', 'playground-simple', 'orgA', 'projectA01', 'staff.json')
const staffJSONDest = path.join(__dirname, '..', '..', '..', '..',
  'test', 'data', 'playground-simple', 'orgA', 'projectA01', 'staff.json')

describe('PUT:/orgs/:orgKey/staff', () => {
  let app
  let count = 1
  beforeEach(() => {
    model.initialize(defaultTestOptions())
    app = appInit(defaultTestOptions({ model }))
    // confirm initial setup
    expect(model.orgs.orgA.staff.list()).toHaveLength(3)
  })
  afterEach(() => { // put the original staff.json back in place
    fs.copyFileSync(staffJSONDest, staffJSONDest + `.${count}`)
    count += 1
    fs.copyFileSync(origStaffJSON, staffJSONDest)
  })
  
  test("deletes", async () => {
    const origCEO = model.orgs.orgA.staff.get('ceo@foo.com')
    const origDev = model.orgs.orgA.staff.get('dev@foo.com')
    const filePath = path.join(__dirname, 'staff-delete.csv');
    const { body, headers, status, text } = await request(app)
      .post('/orgs/orgA/staff') // it reads weird, but this MUST go first
      .accept('application/json')
      .attach('testFile', filePath)
    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/application\/json/)
    expect(body.message.match( /(updated.*){2}/i ))
    expect(model.orgs.orgA.staff.list()).toHaveLength(2)
    expect(model.orgs.orgA.staff.get('ceo@foo.com')).toEqual(origCEO)
    expect(model.orgs.orgA.staff.get('dev@foo.com')).toEqual(origDev)
  })
/*
  test("adds", async () => {
    const filePath = path.join(__dirname, 'staff-delete.csv');
    const { body, headers, status, text } = await request(app)
      .post('/orgs/orgA/staff') // it reads weird, but this MUST go first
      .accept('application/json')
      .attach('testFile', filePath)
    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/application\/json/)
    expect(body.message.match( /(updated.*){2}/i ))
    expect(model.orgs.orgA.staff.list()).toHaveLength(2)
  })
/*
  test("processes plain text requests", async() => {
    const { status, text, headers } = await request(app)
      .get('/') // it reads weird, but this MUST go first
      .set('Accept', 'text/plain')

    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/text\/plain/)
    expect(text).toMatch(new RegExp(`liq-server: ${CURR_VER}`))
  })
*/
})
