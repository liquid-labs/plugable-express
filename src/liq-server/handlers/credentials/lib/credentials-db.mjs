import * as fsPath from 'node:path'

import structuredClone from 'core-js-pure/actual/structured-clone'

import { readFJSON, writeFJSON } from '@liquid-labs/federated-json'
import { checkGitHubAPIAccess } from '@liquid-labs/github-toolkit'

import { CREDS_DB_CACHE_KEY, CRED_SPECS, credStatus, GITHUB_API, GITHUB_SSH } from './constants'

class CredDB {
  static allFields = [ 'key', 'name', 'description', 'status', 'files' ]
  static defaultFields = CredDB.allFields

  #cache
  #db
  #dbPath

  constructor({ app, cache }) {
    const liqHome = app.liqHome()
    this.#dbPath = `${liqHome}/credentials/db.yaml`

    this.#cache = cache

    this.resetDB()
  }

  resetDB() {
    let db = this.#cache?.get(CREDS_DB_CACHE_KEY)
    if (!db) { // load the DB from path
      ([ db ] = readFJSON(this.#dbPath, { createOnNone: {}, separateMeta: true }));
      this.#cache.put(CREDS_DB_CACHE_KEY, db)
    }

    this.#db = db
  }

  writeDB() {
    const writableDB = structuredClone(this.#db)
    for (const entry of Object.entries(this.#db)) {
      if (!(entry.key in CRED_SPECS)) {
        delete entry.description
        delete entry.name
      }
    }

    writeFJSON({ file: this.#dbPath, data: writableDB })
  }

  detail(key) {
    const baseData = CRED_SPECS.find((s) => s.key === key)
    if (baseData === undefined) return baseData

    return Object.assign({ status: credStatus.NOT_SET }, baseData, this.#db[key])
  }

  async import({ destPath, key, noVerify = false, replace, srcPath }) {
    const credSpec = CRED_SPECS.find((c) => c.key === key)
    if (credSpec === undefined) throw new Error(`Cannot import unknown credential type '${key}'.`)

    if (this.#db[key] !== undefined && replace !== true)
      throw new Error(`Credential '${key}' already exists; set 'replace' to true to update the entry.`)

    if (credSpec.type !== 'ssh' && credSpec.type !== 'token')
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

    this.#db[key] = Object.assign({ files, status: credStatus.SET_BUT_UNTESTED }, CRED_SPECS[key])
    if (noVerify === false) {
      try {
        this.verifyCreds({ keys: [ key ], throwOnError: true })
      }
      catch (e) {
        this.resetDB()
        throw e
      }
    }

    this.writeDB()
  }

  list() {
    return CRED_SPECS.map((s) => this.detail(s.key))
  }

  verifyCreds({ keys, reVerify = false, throwOnError = false }) {
    const failed = []

    for (const { files, key, name, status } of this.list()) {
      if (status !== credStatus.NOT_SET && (status !== credStatus.SET_AND_VERIFIED || reVerify === true)
          && ( keys === undefined || keys.includes(key))) {
        try {
          if (key === GITHUB_API) {
            checkGitHubAPIAccess({ filePath: files[0] })
          }
          else if (key === GITHUB_SSH) {
            checkGitHubSSHAccess({ privKeyPath: files[0] })
          }
          else {
            throw new Error(`Do not know how to verify '${name}' (${key}) credentials.`)
          }
          this.#db[key].status = credStatus.SET_AND_VERIFIED
        }
        catch (e) {
          if (throwOnError === true) throw e
          // else
          failed.push(key)
        }
      }
    }
    return failed
  }
}

export {
  CredDB
}
