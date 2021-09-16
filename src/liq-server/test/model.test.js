/* global beforeAll describe expect test */
import * as fs from 'fs'

import { model } from '../model'
import { reporter } from '../lib/reporter'

reporter.configure({ SILENT: true })

const simplePlaygroundPath = `${__dirname}/data/playground-simple`

describe('model', () => {
  describe('initialize', () => {
    beforeAll(() => model.initialize({
      LIQ_PLAYGROUND_PATH: simplePlaygroundPath,
      reporter
    }))
    
    test('creates playground', () => {
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
      expect(model.playground.orgs['orgA']).toBeTruthy()
      expect(model.playground.orgs['orgB']).toBeTruthy()
    })
  })
  
  describe('refreshPlayground', () => {
    test('picks up new projects', () => {
      model.initialize({
        LIQ_PLAYGROUND_PATH: simplePlaygroundPath,
        reporter
      })
      fs.mkdirSync(`${simplePlaygroundPath}/orgA/projectA03`)
      model.refreshPlayground()
      
      expect(Object.keys(model.playground.projects).length).toBe(4)
      expect(model.playground.projects['orgA/projectA03']).toBeTruthy()
    })
  })
})
