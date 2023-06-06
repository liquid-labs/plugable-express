import createError from 'http-errors'

import { httpSmartResponse } from '@liquid-labs/http-smart-response'
import { tryExec } from '@liquid-labs/shell-toolkit'

import { appInit } from '../../../app'
import { determineRegistryData } from './registries/_lib/determine-registry-data'
import { LIQ_CORE_PLUGINS } from '../../../../shared/locations'

const help = {
  name        : 'Plugins add',
  summary     : 'Installs one or more server plugins.',
  description : 'Installs one or more server plugins.'
}
const method = 'put'
const path = ['server', 'plugins', 'add']

const parameters = [
  {
    name         : 'npmNames',
    isMultivalue : true,
    description  : 'The plugins to install, by their NPM package name. Include multiple times to install multiple plugins.',
    optionsFunc  : async({ app, cache }) => {
      // TODO: look for makrers in packaeg.json and incorproate development packages as well?
      const registryData = await determineRegistryData({ app, cache })
      return registryData.reduce((acc, { plugins }) => acc.push(plugins.map(({ npmName }) => npmName)))
    }
  }
]

const func = ({ app, cache, model, reporter }) => async(req, res) => {
  const { npmNames } = req.vars

  let registryData // this functions as a cache, filled as needed
  const alreadyInstalled = []
  const devInstalls = []
  const prodInstalls = []
  for (const testName of npmNames) {
    let matched = app.liq.plugins.some(({ npmName }) => {
      return npmName === testName
    })
    if (matched === true) {
      alreadyInstalled.push(testName)
      continue
    }

    // is it a development package? Notice, we don't check our registry unless we have to
    for (const projectSpec of Object.values(model.playground.projects)) {
      if (testName === projectSpec.packageJSON?.name) {
        devInstalls.push('file:' + projectSpec.localProjectPath)
        matched = true
        break
      }
    }

    if (matched === false) {
      registryData = registryData || await determineRegistryData({ app, cache })
      if (!Object.values(registryData).some(({ plugins }) => plugins.some(({ npmName }) => npmName === testName))) {
        throw createError.NotFound(`No such plugin package '${testName}' found in the registries.`)
      }
      prodInstalls.push(testName)
    }
  }

  const prodInstalled = prodInstalls.length > 0
  const devInstalled = devInstalls.length > 0
  const anyInstalled = prodInstalled || devInstalled

  if (anyInstalled === true) {
    tryExec(`cd "${LIQ_CORE_PLUGINS}" && npm install ${prodInstalls.join(' ')} ${devInstalls.join(' ')}`)
    await appInit({ app, model, ...app.liq.config })
  }

  const msg =
    +(anyInstalled
      ? 'Installed '
      : ((devInstalled
        ? devInstalls.join(', ') + 'development packages'
        : (prodInstalled ? ' and ' : '')))
        + (prodInstalled ? prodInstalls.join(', ' + 'production packages') : ''))
    + (alreadyInstalled.length > 0
      ? (anyInstalled ? '; ' : '')
          + alreadyInstalled.join(', ') + ' packages already installed'
      : '')
    + '.'
  httpSmartResponse({ msg, req, res })
}

export { func, help, method, parameters, path }
