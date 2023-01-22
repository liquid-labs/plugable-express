import * as fs from 'fs'
import * as path from 'path'

import findPlugins from 'find-plugins'

import { registerHandlers } from './register-handlers'

const defaultPluginPath = path.join(process.env.HOME, '.liq', 'plugins', 'core')
const pluginFilter = (pkgInfo) => pkgInfo.pkg.liq?.labels?.some((l) => l === PLUGIN_LABEL)

/**
* Given an app, model, cache, reporter, and plugin path, loads plugins from the path.
*/
const loadPlugins = async(app, {
  model,
  cache,
  reporter,
  pluginPath = process.env.LIQ_PLUGIN_PATH || defaultPluginPath
}) => {
  const pluginPkg = path.join(pluginPath, 'package.json')
  const pluginDir = path.join(pluginPath, 'node_modules')
  reporter.log(`Searching for plugins (in ${path.dirname(pluginDir)})...`)
  const pluginOptions = {
    pkg    : pluginPkg,
    dir    : pluginDir,
    filter : () => true
  }

  const plugins = findPlugins(pluginOptions)

  reporter.log(plugins.length === 0 ? 'No plugins found.' : `Found ${plugins.length} plugins.`)

  for (const plugin of plugins) {
    const sourcePkg = plugin.pkg.name
    reporter.log(`Loading plugins from ${sourcePkg}...`)
    const { main } = JSON.parse(fs.readFileSync(`${plugin.dir}/package.json`))
    const { handlers, setup } = await import(`${plugin.dir}/${main}`) || {}
    if (handlers === undefined && setup === undefined) {
      throw new Error(`'liq-core' plugin from '${sourcePkg}' does not export 'handlers' or 'setup'; bailing out.`)
    }

    if (setup) reporter.log(`Running setup for ${sourcePkg} plugins...`)
    const setupData = setup ? setup({ model, reporter }) : {}

    if (handlers !== undefined) {
      registerHandlers(app, { sourcePkg, handlers, model, reporter, setupData, cache })
    }
  }
}

export {
  defaultPluginPath,
  loadPlugins
}
