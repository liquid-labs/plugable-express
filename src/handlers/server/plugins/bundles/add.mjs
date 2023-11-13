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
    name           : 'bundles',
    isMultivalue   : true,
    description    : 'The name of the bundle to install.',
    optionsFetcher : async({ app, cache }) => {
      const bundles = await getRegistryBundles({ app, cache })
      return bundles.map(({ name }) => name)
    }
  },
  {
    name        : 'orgKey',
    description : `The org key under which to install org-scoped plugins, if any. This parameter is currently requried for bundles containing plugin types other than 'handlers' or 'integrations'.

An "org-scoped" plugin is associated with an org rather than the server as a whole. E.g., each "company policy" plugin would be scoped to a particular org and may be entirely absent for others.`
  }
]

const func = ({ app, cache, reporter }) => async(req, res) => {
  const { bundles : bundleNames = [], orgKey } = req.vars
  if (bundleNames.length === 0) {
    throw createError.BadRequest('Must specify at least one bundle to install.')
  }

  const bundles = await getRegistryBundles({ app, cache/*, update */ })
  const bundlesToInstall = bundles.filter(({ name }) => bundleNames.includes(name))
  reporter.log(`Identified ${bundlesToInstall.length} bundles to install...`)

  // first, we check that we can hadle all the install 'types'
  for (const bundle of bundlesToInstall) {
    for (const type of Object.keys(bundle)) {
      reporter.log(`Checking handling of bundle ${bundle} type ${type}...`)
      // TODO: what's type 'name'? Is it used?
      if (type === 'name' || type === 'handlers') { // we don't care about 'name' and handle 'handlers' ourself
        continue
      }
      else {
        if (type !== 'handlers' && type !== 'integrations' && orgKey === undefined) {
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
      reporter.log(`Installing ${npmNames.length} plugins of type ${type} for bundle ${bundle}...`)
      let installedPlugins, pluginPkgDir

      if (type === 'name') { // we don't care about 'name'
        continue
      }
      else if (type === 'handlers') {
        installedPlugins = app.ext.handlerPlugins
        pluginPkgDir = app.ext.pluginsPath
      }
      else {
        reporter.log(`Determining support for ${type} type handlers...`)
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

  httpSmartResponse({ msg : message, req, res })
}

export { func, help, method, parameters, path }
