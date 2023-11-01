import { httpSmartResponse } from '@liquid-labs/http-smart-response'

import { getRegistryBundles } from './_lib/get-registry-bundles'

const help = {
  name        : 'Bundles detail',
  summary     : 'Provides detail information on a bundle of plugins.',
  description : 'Provides detail information on a bundle of plugins, including listing all the constituent plugins in the bundle.'
}
const method = 'get'
const path = ['server', 'plugins', 'bundles', ':pluginBundle', 'detail']
const parameters = []

const func = ({ app, cache }) => async(req, res) => {
  const { pluginBundle } = req.vars

  const bundles = await getRegistryBundles({ app, cache/*, update */ })
  const bundle = bundles.find((b) => b.name === pluginBundle)

  httpSmartResponse({ data : bundle, req, res })
}

export { func, help, method, parameters, path }
