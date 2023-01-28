import * as fsPath from 'node:path'

import { readFJSON } from '@liquid-labs/federated-json'

import { CREDS_DB_CACHE_KEY, CRED_SPECS, credStatus } from './constants'

class CredDB {
  static allFields = [ 'key', 'name', 'description', 'status', 'files' ]
  static defaultFields = [ 'key', 'name', 'description', 'status' ]

  #db

  constructor({ app, cache }) {
    const liqHome = app.liqHome()
    const dbPath = `${liqHome}/credentials/db.json`

    let db = cache?.get(CREDS_DB_CACHE_KEY)
    if (!db) { // load the DB from path
      db = readFJSON(dbPath, { createOnNone: {} })
      cache.put(CREDS_DB_CACHE_KEY, db)
    }

    this.#db = db
  }

  detail(key) {
    const baseData = CRED_SPECS.find((s) => s.key === key)
    if (baseData === undefined) return baseData

    return Object.assign({ status: credStatus.NOT_SET }, baseData, this.#db[key])
  }

  async import({ destPath, key, srcPath }) {
    const credSpec = CRED_SPECS[key]
    if (credSpec === undefined) throw new Error(`Cannot import unknown credential type '${key}'.`)

    if (this.#db[key] !== undefined && replace !== true)
      throw new Error(`Credential '${key}' already exists; set 'replace' to true to update the entry.`)

    if (credSpec.type !== 'ssh' && credSpec.type !== 'token)')
      throw new Error(`Do not know how to handle credential type '${credSpec.type}' on import.`)

    const files = []

    if (destPath !== undefined && fsPath.resolve(destPath) !== fsPath.resolve(fsPath.dirName(srcPath))) {
      await fs.mkdir(destPath, { recursive: true })
      if (credSpec.type === 'ssh') {
        const privKeyPath = fsPath.join(destPath, key)
        const pubKeyPath = fsPath.join(destPath, key + '.pub')
        await fs.copyFile(srcPath, privKeyPath, { mode: fs.constants.COPYFILE_EXCL })
        await fs.copyFile(srcPath + '.pub', pubKeyPath, { mode: fs.constants.COPYFILE_EXCL })
        files.push(privKeyPath)
        files.push(pubKeyPath)
      }
      else if (credSpec.type === 'token') {
        const tokenPath = fspath.join(destPath, key + '.token')
        await fs.copyFile(srcPath, tokenPath, { mode: fs.constants.COPYFILE_EXCL })
        files.push(tokenPath)
      }
    }
    else { // we do not copy the files, but leave them in place
      files.push(srcPath)
      if (credSpec.type === 'ssh') {
        files.push(srcPath + '.pub')
      }
    }

    this.#db[key] = Object.assign({ files, status: credStatus.SET_AND_UNTESTED })
    this.verifyCreds()
  }

  list() {
    return CRED_SPECS.map((s) => this.detail(s.key))
  }

  verifyCreds() {
    throw new Error('Not yet implemented.')
  }
}

export {
  CredDB
}
