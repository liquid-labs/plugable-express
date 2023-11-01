import createError from 'http-errors'

import { httpSmartResponse } from '@liquid-labs/http-smart-response'
import { installPlugins } from '@liquid-labs/liq-plugins-lib'

import { getRegistryBundles } from './_lib/get-registry-bundles'

const help = {
  name        : 'Bundles add',
  summary     : 'Adds a bundle of plugins to the server.',
  description : 'Adds a bundle of plugins to the server. Bundles are predefined sets of plugins which cover a set of related functions and together create a cohesive application or set of features.'
}
const method = 'put'
const path = ['server', 'plugins', 'bundles', 'add']
const parameters = [
  {
    name           : 'installBundles',
    isMultivalue   : true,
    description    : 'The name of the bundle to install.',
    optionsFetcher : async({ app, cache }) => {
      const bundles = await getRegistryBundles({ app, cache })
      return bundles.map(({ name }) => name)
    }
  },
  {
    name        : 'orgKey',
    description : "The org key under which to install org-scoped plugins, if any. This parameter is requried for bundles containing plugin types other than 'handlers' or 'integrations'."
  }
]

const func = ({ app, cache, reporter }) => async(req, res) => {
  const { installBundles = [], orgKey } = req.vars
  if (installBundles.length === 0) {
    throw createError.BadRequest('Must specify at least one bundle to install.')
  }

  const bundles = await getRegistryBundles({ app, cache/*, update */ })
  const bundlesToInstall = bundles.filter(({ name }) => installBundles.includes(name))

  console.log('bundlesToInstall:', bundlesToInstall) // DEBUG
  // first, we check that we can hadle all the install 'types'
  for (const bundle of bundlesToInstall) {
    for (const type of Object.keys(bundle)) {
      if (type === 'name' || type === 'handlers') { // we don't care about 'name' and handle 'handlers' ourself
        continue
      }
      else {
        if (type !== 'handlers' && type !== 'integrations') {
          throw createError.BadRequest(`Found bundle containing org-scoped plugins type '${type}'; you must define the 'orgKey' parameter.`)
        }

        const canHandle = app.ext.integrations.hasHook({ providerFor : type + ' plugins', hook : 'installedPlugins' })
          && app.ext.integrations.hasHook({ providerFor : type + ' plugins', hook : 'pluginPackageDir' })

        if (canHandle !== true) {
          throw createError.BadRequest(`Bundle cannot be installed; do not know how to handle plugin type '${type}'.`)
        }
      }
    }
  }
  // else, if we get here then we can handle all the plugins installs
  let message = ''
  for (const bundle of bundlesToInstall) {
    for (const [type, npmNames] of Object.entries(bundle)) {
      let installedPlugins, pluginPkgDir

      if (type === 'name') { // we don't care about 'name'
        continue
      }
      else if (type === 'handlers') {
        installedPlugins = app.ext.handlerPlugins
        pluginPkgDir = app.ext.pluginsPath
      }
      else {
        installedPlugins = await app.ext.integrations.callHook({
          providerFor : type + ' plugins',
          hook        : 'installedPlugins',
          hookArgs    : { app, orgKey }
        })
        pluginPkgDir = await app.ext.integrations.callHook({
          providerFor : type + ' plugins',
          hook        : 'pluginPackageDir',
          hookArgs    : { app, orgKey }
        })
      }

      if (message !== '') {
        message += '\n\n'
      }

      message += await installPlugins({
        app,
        cache,
        hostVersion : app.ext.serverVersion,
        installedPlugins,
        npmNames,
        pluginPkgDir,
        pluginType  : type,
        reloadFunc  : app.reload,
        reporter,
        req,
        res
      })
    }
  }

  httpSmartResponse({ msg: message, req, res })
}

export { func, help, method, parameters, path }
