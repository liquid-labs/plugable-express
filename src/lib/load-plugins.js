import { existsSync } from 'node:fs'
import * as path from 'path'

import findPlugins from 'find-plugins'

import { registerHandlers } from './register-handlers'

// Everything in the plugin pkg is a plugin in
// const pluginFilter = (pkgInfo) => pkgInfo.pkg.liq?.labels?.some((l) => l === PLUGIN_LABEL)

/**
 * Loads a single plugin.
 */
const loadPlugin = async({ app, cache, reporter, dir, pkg }) => {
  const { main, name: npmName, description, version } = pkg
  // Since we pull the 'summary' from the package.json description, there may be unecessary context which is clear when
  // asking 'describe this plugin'. So, we look for this specific phrase and remove it.
  const summary = description?.replace(/ +(?:for|in) a @liquid-labs\/plugable-express server/, '')
  const { handlers, setup } = await import(`${dir}/${main}`) || {}
  if (handlers === undefined && setup === undefined) {
    throw new Error(`Plugin from '${npmName}' does not export 'handlers' or 'setup'; bailing out.`)
  }

  if (setup !== undefined) reporter.log(`Running setup for ${npmName} plugins...`)
  let setupData = setup?.({ app, cache, reporter })
  if (setupData?.then !== undefined) {
    setupData = await setupData
  }

  app.ext.pendingHandlers.push(() => {
    if (handlers !== undefined) {
      registerHandlers(app, { npmName, handlers, reporter, setupData, cache })
    }

    app.ext.handlerPlugins.push({ summary, npmName, version })
  })
}

/**
 * Given an app, cache, reporter, and plugin path, loads plugins from the path.
 */
const loadPlugins = async(app, { cache, reporter, pluginsPath }) => {
  if (pluginsPath === null) {
    throw new Error("No 'pluginsPath' defined when trying to load plugins.")
  }

  const pluginPkg = path.join(pluginsPath, 'package.json')
  const pluginDir = path.join(pluginsPath, 'node_modules')
  reporter.log(`Searching for handler plugins (in ${path.dirname(pluginDir)})...`)
  const pluginOptions = {
    pkg    : pluginPkg, // will load dependencies as plugins
    dir    : pluginDir, // will load from here
    filter : () => true // every dependency is a plugin
  }

  const plugins = existsSync(pluginPkg) ? findPlugins(pluginOptions) : []

  reporter.log(plugins.length === 0 ? 'No plugins found.' : `Found ${plugins.length} plugins.`)

  for (const plugin of plugins) {
    await loadPlugin({ app, cache, reporter, ...plugin })
  }
}

export {
  loadPlugin,
  loadPlugins
}
