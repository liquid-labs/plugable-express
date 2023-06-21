import * as fsPath from 'node:path'

import { writeFJSON } from '@liquid-labs/federated-json'
import { httpSmartResponse } from '@liquid-labs/http-smart-response'

import { LIQ_HOME } from '../../../../../shared/locations'
import { REGISTRY_DATA_KEY } from './_lib/determine-registry-data'

const help = {
  name        : 'Registries remove',
  summary     : 'Removes a reistry from the list of plugin registries.',
  description : 'Removes a reistry from the list of plugin registries.'
}
const method = 'delete'
const path = ['server', 'plugins', 'registries', 'remove']

const parameters = [
  {
    name         : 'registryURLs',
    isMultivalue : true,
    required     : true,
    description  : 'The URL of a registry to add. May specify multiple times to add multiple registries.',
    optionsFunc  : ({ app }) => app.liq?.serverSettings?.registries?.map(({ url }) => url) || []
  }
]

const func = ({ app, cache, reporter }) => (req, res) => {
  const { registryURLs } = req.vars

  const serverSettings = app.liq.serverSettings || {}
  if (!('registries' in serverSettings)) {
    serverSettings.registries = []
  }
  const registries = serverSettings.registries
  const initialSize = registries.length

  for (const registryURL of registryURLs) {
    const regI = registries.findIndex(({ url }) => url === registryURL)
    if (regI > -1) {
      registries.splice(regI, 1)
    }
  }

  const serverSettingsPath = fsPath.join(LIQ_HOME(), 'server-settings.yaml')
  writeFJSON({ file : serverSettingsPath, data : serverSettings })

  cache.delete(REGISTRY_DATA_KEY)

  httpSmartResponse({ msg : `Removed ${initialSize - registries.length} registries.`, data : serverSettings.registries, req, res })
}

export { func, help, method, parameters, path }
