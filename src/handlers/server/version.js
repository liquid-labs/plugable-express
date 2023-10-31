import * as fs from 'node:fs'
import http from 'node:http'
import * as os from 'node:os'
import * as sysPath from 'node:path'

import { httpSmartResponse } from '@liquid-labs/http-smart-response'

import { safeJSONParse } from '../../lib/json-helpers'

const method = 'get'
const path = ['server', 'version']
const parameters = []

const func = ({ app, cache, reporter }) => (req, res) => {

  const versionInfo = {
    name               : app.ext.name,
    version            : app.ext.version,
    'plugable-express' : app.ext.serverVersion,
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

  const msg = `${app.ext.name}: ${app.ext.version}
plugable-express: ${versionInfo.server}
node: ${versionInfo.node}
platform:${versionInfo.platform}
`
  httpSmartResponse({ msg, data : versionInfo, req, res })
}

export { func, path, method, parameters }
