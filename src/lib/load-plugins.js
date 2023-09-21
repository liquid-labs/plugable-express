import * as path from 'path'

import findPlugins from 'find-plugins'

import { registerHandlers } from './register-handlers'

// Everything in the plugin pkg is a plugin in
// const pluginFilter = (pkgInfo) => pkgInfo.pkg.liq?.labels?.some((l) => l === PLUGIN_LABEL)

/**
 * Loads a single plugin.
 */
const loadPlugin = async({ app, cache, model, reporter, dir, pkg }) => {
  const { main, name: npmName, version } = pkg
  const { handlers, name = 'UNKNOWN', setup, summary } = await import(`${dir}/${main}`) || {}
  if (handlers === undefined && setup === undefined) {
    throw new Error(`Plugin from '${npmName}' does not export 'handlers' or 'setup'; bailing out.`)
  }

  if (setup !== undefined) reporter.log(`Running setup for ${npmName} plugins...`)
  let setupData = setup?.({ app, cache, model, reporter })
  if (setupData?.then !== undefined) {
    setupData = await setupData
  }

  app.ext.pendingHandlers.push(() => {
    let handlersInfo = []
    if (handlers !== undefined) {
      handlersInfo = registerHandlers(app, { npmName, handlers, model, name, reporter, setupData, cache })
    }

    app.ext.handlerPlugins.push({ name, summary, npmName, handlersInfo, version })
  })
}

/**
 * Given an app, model, cache, reporter, and plugin path, loads plugins from the path.
 */
const loadPlugins = async(app, { model, cache, reporter, pluginsPath }) => {
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

  const plugins = findPlugins(pluginOptions)

  reporter.log(plugins.length === 0 ? 'No plugins found.' : `Found ${plugins.length} plugins.`)

  for (const plugin of plugins) {
    await loadPlugin({ app, cache, model, reporter, ...plugin })
  }
}

export {
  loadPlugin,
  loadPlugins
}
