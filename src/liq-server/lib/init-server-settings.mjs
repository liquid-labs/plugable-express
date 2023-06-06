import * as fsPath from 'node:path'

import createError from 'http-errors'

import { writeFJSON } from '@liquid-labs/federated-json'
import { Questioner } from '@liquid-labs/question-and-answer'

import { defaults, LIQ_REGISTRIES } from '../defaults'
import { getLiqHome } from './get-liq-home'
import { getServerSettings } from './get-server-settings'

const initServerSettings = async({ reAsk = false, serverSettings }) => {
  serverSettings = serverSettings || getServerSettings()

  const ibActions = []
  const initInterrogationBundle = {
    actions : ibActions
  }

  const registries = serverSettings.registries
  console.log('env:', process.env) // debug
  const envRegistries = process.env[LIQ_REGISTRIES]
  if (envRegistries !== undefined) {
    if (Array.isArray(envRegistries)) {
      serverSettings.registries = structuredClone(envRegistries)
    }
    else if (typeof envRegistries === 'string') {
      serverSettings.registries = envRegistries.split(/\s*,\s*/)
    }
    else {
      throw createError.BadRequest(`Invalid value for env variable '${LIQ_REGISTRIES}'; must be string or array of strings.`)
    }
  }
  else if (registries === undefined || registries.length === 0) {
    ibActions.push({
      prompt    : 'Enter the plugin registr(y/ies) to use:',
      multValue : true,
      parameter : 'registries',
      default   : defaults[LIQ_REGISTRIES]
    })
  }

  if (ibActions.length > 0 || reAsk === true) {
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

    const serverSettingsPath = fsPath.join(getLiqHome(), 'server-settings.yaml')
    writeFJSON({ file : serverSettingsPath, data : serverSettings })
  }

  return serverSettings
}

export { initServerSettings }
