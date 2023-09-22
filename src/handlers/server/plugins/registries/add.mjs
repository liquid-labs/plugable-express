import * as fsPath from 'node:path'

import { writeFJSON } from '@liquid-labs/federated-json'
import { httpSmartResponse } from '@liquid-labs/http-smart-response'

import { REGISTRY_DATA_KEY } from './_lib/determine-registry-data'

const help = {
  name        : 'Registries add',
  summary     : 'Adds a reistry to the list of plugin registries.',
  description : 'Adds a reistry to the list of plugin registries.'
}
const method = 'put'
const path = ['server', 'plugins', 'registries', 'add']

const parameters = [
  {
    name         : 'registryURLs',
    isMultivalue : true,
    required     : true,
    description  : 'The URL of a registry to add. May specify multiple times to add multiple registries.'
  }
]

const func = ({ app, cache, reporter }) => (req, res) => {
  const { registryURLs } = req.vars

  const serverSettings = app.ext.serverSettings
  if (!('registries' in serverSettings)) {
    serverSettings.registries = []
  }
  const registries = serverSettings.registries
  const initialSize = registries.length

  for (const registryURL of registryURLs) {
    if (!registries.some(({ url }) => url === registryURL)) {
      registries.push({ url : registryURL })
    }
  }

  const serverSettingsPath = fsPath.join(app.ext.serverHome, 'server-settings.yaml')
  writeFJSON({ file : serverSettingsPath, data : serverSettings })
  app.ext.serverSettings = serverSettings

  cache.delete(REGISTRY_DATA_KEY)

  httpSmartResponse({ msg : `Added ${registries.length - initialSize} registries.`, data : serverSettings.registries, req, res })
}

export { func, help, method, parameters, path }
