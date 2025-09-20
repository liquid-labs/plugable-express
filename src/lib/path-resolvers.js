const serverPluginName = {
  bitReString    : '((?:@|%40)[a-z0-9-~][a-z0-9-._~]*(?:[/]|%2f|%2F))?([a-z0-9-~][a-z0-9-._~]*)',
  optionsFetcher : ({ app }) => {
    return app.ext.handlerPlugins.map(({ npmName }) => npmName)
  }
}

const commonPathResolvers = { serverPluginName }

export { commonPathResolvers }
