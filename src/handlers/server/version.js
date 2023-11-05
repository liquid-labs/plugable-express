import http from 'node:http'
import * as os from 'node:os'

import { httpSmartResponse } from '@liquid-labs/http-smart-response'

const help = {
  name: 'Server version',
  summary: 'Provides version information for the server aand its components.',
  descirption: "Provides version information for the server aand its components. This includes the underlying 'plugable-server' version (which is used to determine plugin compatibility), as well as information on node and the platform where the server is running."
}

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

export { func, help, path, method, parameters }
