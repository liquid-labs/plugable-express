import * as fs from 'node:fs'
import http from 'node:http'
import * as os from 'node:os'
import * as sysPath from 'node:path'

import { httpSmartResponse } from '@liquid-labs/http-smart-response'

import { safeJSONParse } from '../../lib/json-helpers'

const method = 'get'
const path = ['server']
const parameters = []

const func = ({ app, cache, reporter }) => (req, res) => {
  let versionInfo = cache.get(func) // we assume versions are stable while running

  if (versionInfo === undefined) {
    const dirpath = __dirname
    const pkgLocations = [
      sysPath.join(dirpath, '..', 'package.json'), // production
      sysPath.join(dirpath, '..', '..', '..', 'package.json') // testing
    ]

    const pkgPath = pkgLocations.find((testPath) => {
      return fs.existsSync(testPath)
    })
    if (!pkgPath) {
      throw new Error('Could not determine location of servers package.json file.')
    }

    const pkgJSON = safeJSONParse(pkgPath)
    if (pkgJSON === null) {
      res.status(500).json({ message : "Could not locate server's package definition; installation may be corrupted." })
      return
    }

    versionInfo = {
      name               : app.ext.name,
      version            : app.ext.version,
      'plugable-express' : pkgJSON.version,
      node               : process.version,
      fullNode           : process.versions,
      platform           : `${os.type()} ${os.release()}`,
      fullPlatform       : {
        platform : os.platform(),
        type     : os.type(),
        version  : os.version(),
        release  : os.release()
      },
      supportedMethods : http.METHODS
    }

    cache.put(func, versionInfo)
  }

  const msg = `${app.ext.name}: ${app.ext.version}
plugable-express: ${versionInfo.server}
node: ${versionInfo.node}
platform:${versionInfo.platform}
`
  console.log('versionInfo:', versionInfo) // DEBUG
  httpSmartResponse({ msg, data : versionInfo, req, res })
}

export { func, path, method, parameters }
