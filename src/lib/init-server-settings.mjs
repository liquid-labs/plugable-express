import * as fsPath from 'node:path'

import isEqual from 'lodash/isEqual'

import { writeFJSON } from '@liquid-labs/federated-json'
import { Questioner } from '@liquid-labs/question-and-answer'

import { getServerSettings } from './get-server-settings'

const initServerSettings = async({ ask = false, defaultRegistries, noRegistries = false, serverHome } = {}) => {
  const serverSettings = getServerSettings(serverHome) || {}
  const origSettings = structuredClone(serverSettings)

  const ibActions = []
  const initInterrogationBundle = {
    actions : ibActions
  }

  const registries = serverSettings.registries

  // at the moment, registries is the only config, so we just skip everything if not using registries
  if (noRegistries !== true && (registries === undefined || registries.length === 0 || reAsk === true)) {
    if (ask !== true && defaultRegistries !== undefined) {
      serverSettings.registries = defaultRegistries
    }
    else {
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
    const serverSettingsPath = fsPath.join(serverHome, 'server-settings.yaml')
    writeFJSON({ file : serverSettingsPath, data : serverSettings })
  }

  return serverSettings
}

export { initServerSettings }
