import { existsSync } from 'node:fs'
import * as fsPath from 'node:path'

import { readFJSON, writeFJSON } from '@liquid-labs/federated-json'

const getServerSettings = (serverHome) => {
  // TODO: this causes a race condition; should instead just try to read with federated JSON and ignore 'file not
  // found' exceptions
  const serverSettingsPath = fsPath.join(serverHome, 'server-settings.yaml')
  if (existsSync(serverSettingsPath)) {
    return readFJSON(serverSettingsPath) || {}
  }
  else {
    const serverSettings = {
      registries : []
    }

    writeFJSON({ file : serverSettingsPath, data : serverSettings })

    return serverSettings
  }
}

export { getServerSettings }
