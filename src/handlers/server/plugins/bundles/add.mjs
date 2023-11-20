import createError from 'http-errors'

import { httpSmartResponse } from '@liquid-labs/http-smart-response'
import { installPlugins } from '@liquid-labs/liq-plugins-lib'

import { getServerBundles } from './_lib/get-server-bundles'

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
      const bundles = await getServerBundles({ app, cache })
      return bundles.map(({ name }) => name)
    }
  }
]

const func = ({ app, cache, reporter }) => async(req, res) => {
  const { bundles : bundleNames = [] } = req.vars
  if (bundleNames.length === 0) {
    throw createError.BadRequest('Must specify at least one bundle to install.')
  }

  const bundles = await getServerBundles({ app, cache/*, update */ })
  const bundlesToInstall = bundles.filter(({ name }) => bundleNames.includes(name))
  reporter.log(`Identified ${bundlesToInstall.length} bundles to install...`)

  const installedPlugins = app.ext.handlerPlugins
  const pluginPkgDir = app.ext.pluginsPath

  let message = ''
  for (const { plugins : npmNames } of bundlesToInstall) {
    message += await installPlugins({
      app,
      cache,
      hostVersion : app.ext.serverVersion,
      installedPlugins,
      npmNames,
      pluginPkgDir,
      pluginType  : 'server',
      reloadFunc  : app.reload,
      reporter,
      req,
      res
    })
  }

  httpSmartResponse({ msg : message, req, res })
}

export { func, help, method, parameters, path }
