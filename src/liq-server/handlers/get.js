import * as fs from 'fs'
import * as os from 'os'
import * as sysPath from 'path'

import { safeJSONParse } from '../lib/load-playground'

const verb = 'get'
const path = '/'

const func = ({ cache, reporter }) => (req, res) => {
  let versionInfo = cache.get(func) // we assume versions are stable while running

  if (versionInfo === undefined) {
    // Note, you might think we could use the playground, but the server might be running as an installed package.
    const pkgLocations = [
      sysPath.join(__dirname, '..', 'package.json'), // production
      sysPath.join(__dirname, '..', '..', 'package.json') // testing
    ]
    const pkgPath = pkgLocations.find((testPath) => {
      return fs.existsSync(testPath)
    })
    if (!pkgPath) {
      throw new Error('Could not determine location of servers packag.json file.')
    }

    const pkgJSON = safeJSONParse(pkgPath)
    if (pkgJSON === null) {
      res.status(500).send("Could not locate server's package definition; installation may be corrupted.")
      return
    }

    versionInfo = {
      server       : pkgJSON.version,
      node         : process.version,
      fullNode     : process.versions,
      platform     : `${os.type()} ${os.release()}`,
      fullPlatform : {
        platform : os.platform(),
        type     : os.type(),
        version  : os.version(),
        release  : os.release()
      }
    }

    cache.set(func, versionInfo)
  }

  if (req.accepts('json')) {
    res.setHeader('content-type', 'application/json')
      .json(versionInfo)
  }
  else if (req.accepts('text')) {
    res.setHeader('content-type', 'text/plain')
      .send(`liq-server: ${versionInfo.server}\nnode: ${versionInfo.node}\nplatform:${versionInfo.platform}\n`)
  }
  else {
    res.status(406).send("The server does not support any response format acceptable to the client. Try one or more of:\nAccept: application/json'\nAccept: text/plain")
  }
}

export { func, path, verb }
