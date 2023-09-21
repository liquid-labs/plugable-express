import * as fsPath from 'node:path'

import createError from 'http-errors'

import { writeFJSON } from '@liquid-labs/federated-json'
import { Questioner } from '@liquid-labs/question-and-answer'

import { defaults, LIQ_REGISTRIES } from '../defaults'
import { getServerSettings } from './get-server-settings'

const initServerSettings = async({ 
  app, 
  defaultRegistries, 
  reAsk = false, 
  serverSettings, 
  useDefaultSettings = false 
} = {}) => {
  serverSettings = serverSettings || getServerSettings(app.ext.serverHome)

  const ibActions = []
  const initInterrogationBundle = {
    actions : ibActions
  }

  const registries = serverSettings.registries
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
  else {
    if (useDefaultSettings === true) {
      Object.assign(serverSettings, { defaultRegistries })
    }
    else if (registries === undefined || registries.length === 0 || reAsk === true) {
      ibActions.push({
        prompt    : 'Enter the plugin registr(y/ies) to use:',
        multValue : true,
        parameter : 'registries',
        default   : defaultRegistries
      })
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

    const serverSettingsPath = fsPath.join(app.ext.serverHome, 'server-settings.yaml')
    writeFJSON({ file : serverSettingsPath, data : serverSettings })
  }

  return serverSettings
}

export { initServerSettings }
