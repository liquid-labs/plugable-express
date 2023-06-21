/* global afterAll beforeAll describe expect test */
import * as fs from 'node:fs'
import * as fsPath from 'node:path'

import { initModel } from '../model'
import { defaultTestOptions } from './lib/test-utils'

const testOptions = defaultTestOptions()

describe('model', () => {
  describe('playground', () => {
    describe('initialization', () => {
      let model

      beforeAll(() => {
        process.env.LIQ_PLAYGROUND = testOptions.LIQ_PLAYGROUND_PATH
        model = initModel(testOptions)
      })
      afterAll(() => delete process.env.LIQ_PLAYGROUND)

      test('is part of the model', () => {
        expect(model.playground).toBeTruthy()
      })

      test('ignores files at the org level', () => {
        expect(Object.keys(model.orgs).length).toBe(1)
        expect(model.orgs['ignore-me.file']).toBeUndefined()
      })

      test("ignores org-level directories marked with '.liq-ignore'", () => {
        expect(model.orgs['ignore-me']).toBeUndefined()
      })

      test('loads all orgs', () => {
        expect(Object.keys(model.orgs).length).toBe(1)
        expect(model.orgs.orgA).toBeTruthy()
        expect(model.orgs.orgB).toBe(undefined)
      })

      test('indexes projects by base directory', () => {
        const projectA01Dir = fsPath.resolve(__dirname, 'data', 'playground-simple', 'orgA', 'projectA01')
        // expect(model.playground.projects.getByIndex({ indexName : 'projectPath', key : projectA01Dir })).toBeTruthy()
        expect(model.playground.projects.getByIndex('localProjectPath', projectA01Dir)).toBeTruthy()
      })
    })

    describe('load', () => {
      let model
      const newProjectPath = `${defaultTestOptions().LIQ_PLAYGROUND_PATH}/orgA/projectA03`
      beforeAll(() => {
        process.env.LIQ_PLAYGROUND = testOptions.LIQ_PLAYGROUND_PATH
        model = initModel(testOptions)

        fs.mkdirSync(newProjectPath)
        model.playground.load()
      })
      afterAll(() => {
        delete process.env.LIQ_PLAYGROUND
        fs.rmSync(newProjectPath, { recursive : true })
      })

      test("picks up new project 'OrgA/projectA03'", () => {
        expect(model.playground.projects.get('orgA/projectA03')).toBeTruthy()
        expect(model.playground.projects.list()).toHaveLength(4)
        expect(model.playground.projects.get('orgA/projectA03')).toBeTruthy()
      })
    })
  })

  // TODO: do some org unit testing!
  /* describe('org', () => {
    describe('initialization', () => {

    })
  }) */
})
