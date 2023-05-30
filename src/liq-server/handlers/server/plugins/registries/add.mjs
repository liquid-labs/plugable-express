import * as fsPath from 'node:path'

import { writeFJSON } from '@liquid-labs/federated-json'
import { httpSmartResponse } from '@liquid-labs/http-smart-response'

const help = {
  name        : 'Registries add',
  summary     : 'Adds a reistry to the list of plugin registries.',
  description : 'Adds a reistry to the list of plugin registries.'
}
const method = 'put'
const path = ['server', 'plugins', 'registries', 'add']

const parameters = [
  {
    name        : 'registryURLs',
    isMultivalue: true,
    required    : true,
    description : 'The URL of a registry to add. May specify multiple times to add multiple registries.'
  }
]

const func = ({ app, reporter }) => (req, res) => {
  const { registryURLs } = req.vars

  const serverSettings = app.liq.serverSettings
  if (!('registries' in serverSettings)) {
    serverSettings.registries = []
  }

  for (const registryURL of registryURLs) {
    if (!serverSettings.registries.some(({ url }) => url === registryURL)) {
      serverSettings.registries.push({ url : registryURL })
    }
  }

  const serverSettingsPath = fsPath.join(app.liq.home(), 'server-settings.yaml')
  writeFJSON({ file : serverSettingsPath, data : serverSettings })

  httpSmartResponse({ msg : `Added ${registryURLs.length} registries.`, data : serverSettings.registries, req, res })
}

export { func, help, method, parameters, path }
