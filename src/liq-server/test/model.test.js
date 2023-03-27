/* global afterAll beforeAll describe expect test */
import * as fs from 'node:fs'
import * as fsPath from 'node:path'

import { model } from '../model'
import { defaultTestOptions } from './lib/test-utils'

describe('model', () => {
  describe('playground', () => {
    describe('initialization', () => {
      beforeAll(() => model.initialize(defaultTestOptions()))

      test('is part of the model', () => {
        expect(model.playground).toBeTruthy()
      })

      test('ignores files at the org level', () => {
        expect(Object.keys(model.playground.orgs).length).toBe(2)
        expect(model.playground.orgs['ignore-me.file']).toBeUndefined()
      })

      test("ignores org-level directories marked with '.liq-ignore'", () => {
        expect(model.playground.orgs['ignore-me']).toBeUndefined()
      })

      test('loads all orgs', () => {
        expect(Object.keys(model.playground.orgs).length).toBe(2)
        expect(model.playground.orgs.orgA).toBeTruthy()
        expect(model.playground.orgs.orgB).toBeTruthy()
      })

      test('indexes projects by base directory', () => {
        expect(Object.keys(model.playground.projectsByDir)).toHaveLength(3)
        const projectA01Dir = fsPath.resolve(__dirname, 'data', 'playground-simple', 'orgA', 'projectA01')
        expect(model.playground.projectsByDir[projectA01Dir]).toBeTruthy()
      })
    })

    describe('refreshPlayground', () => {
      beforeAll(() => { model.initialize(defaultTestOptions()) })

      test('produces an equivalent model with no changes', () => {
        const playgroundA = model.playground
        model.refreshPlayground()
        expect(model.playground).not.toBe(playgroundA)
        expect(model.playground).toEqual(playgroundA)
      })

      describe('with new project OrgA/projectA03', () => {
        beforeAll(() => {
          fs.mkdirSync(newProjectPath)
          model.refreshPlayground()
        })
        const newProjectPath = `${defaultTestOptions().LIQ_PLAYGROUND_PATH}/orgA/projectA03`

        afterAll(() => {
          fs.rmSync(newProjectPath, { recursive : true })
        })

        test('picks up new projects', () => {
          expect(Object.keys(model.playground.projects).length).toBe(4)
          expect(model.playground.projects['orgA/projectA03']).toBeTruthy()
        })
      })
    })
  })

  // TODO: do some org unit testing!
  /* describe('org', () => {
    describe('initialization', () => {

    })
  }) */
})
