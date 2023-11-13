import * as fsPath from 'node:path'

import isEqual from 'lodash/isEqual'

import { writeFJSON } from '@liquid-labs/federated-json'
import { Questioner } from '@liquid-labs/question-and-answer'

import { getServerSettings } from './get-server-settings'

const initServerSettings = async({
  app,
  defaultRegistries,
  reAsk = false,
  serverSettings,
  useDefaultSettings = false
} = {}) => {
  serverSettings = serverSettings || getServerSettings(app.ext.serverHome)
  const origSettings = structuredClone(serverSettings)

  const ibActions = []
  const initInterrogationBundle = {
    actions : ibActions
  }

  const registries = serverSettings.registries

  // at the moment, registries is the only config, so we just skip everything if not using registries
  if (app.ext.noRegistries !== true && (registries === undefined || registries.length === 0 || reAsk === true)) {
    if (useDefaultSettings === true) {
      serverSettings.registries = defaultRegistries
    }
    else if (reAsk === true) {
      ibActions.push({
        prompt    : 'Enter the plugin registr(y/ies) to use:',
        multValue : true,
        parameter : 'registries',
        default   : defaultRegistries
      })
    }
  }

  if (ibActions.length > 0) {
    const questioner = new Questioner({
      interrogationBundle : initInterrogationBundle,
      noSkipDefined       : reAsk,
      parameters          : serverSettings
    })
    await questioner.question()

    // TODO: do a deep merge
    const values = questioner.values
    if (values.registries) {
      values.registries = values.registries.map((url) => ({ url }))
    }
    Object.assign(serverSettings, questioner.values)
  }

  if (!isEqual(origSettings, serverSettings)) {
    const serverSettingsPath = fsPath.join(app.ext.serverHome, 'server-settings.yaml')
    writeFJSON({ file : serverSettingsPath, data : serverSettings })
  }

  return serverSettings
}

export { initServerSettings }
