import createError from 'http-errors'
import { httpSmartResponse } from '@liquid-labs/http-smart-response'
import { uninstall } from '@liquid-labs/npm-toolkit'

const removePluginsSetup = ({ pluginsDesc }) => {
  const help = {
    name        : `remove ${pluginsDesc} plugins`,
    summary     : 'Removes the named plugin.',
    description : 'Removes the named plugin.'
  }

  const method = 'delete'

  const parameters = []

  return { help, method, parameters }
}

const removePluginsHandler = ({ installedPluginsRetriever, nameKey, pluginPkgDirRetriever, reloadFunc }) =>
  ({ app, reporter }) => async(req, res) => {
    const installedPlugins = installedPluginsRetriever({ app, req })
    const pluginName = req.vars[nameKey]

    const pluginData = installedPlugins.find(({ npmName }) => pluginName === npmName)
    if (!pluginData) {
      throw createError.NotFound(`No such plugin '${pluginName}' found.`)
    }
    // else

    const npmName = pluginData.npmName
    const pluginPkgDir = pluginPkgDirRetriever({ app, reporter, req })

    // Use npm-toolkit's uninstall function for safe package removal
    await uninstall({
      packages    : [npmName],
      projectPath : pluginPkgDir
    })

    if (reloadFunc !== undefined) {
      const reload = reloadFunc({ app })
      if (reload.then) {
        await reload
      }
    }

    httpSmartResponse({ msg : `<em>Removed<rst> <code>${pluginName}<rst> plugin. Server endpoints refreshed.`, req, res })
  }

const { help, method, parameters } = removePluginsSetup({ pluginsDesc : 'server endpoint' })

const pluginNameKey = 'serverPluginName'

const path = ['server', 'plugins', ':' + pluginNameKey, 'remove']

const installedPluginsRetriever = ({ app }) => app.ext.handlerPlugins

const func = removePluginsHandler({
  installedPluginsRetriever,
  nameKey               : pluginNameKey,
  pluginPkgDirRetriever : ({ app }) => app.ext.dynamicPluginInstallDir || app.ext.serverHome,
  reloadFunc            : ({ app }) => app.reload()
})

export { func, help, method, parameters, path }
