import createError from 'http-errors'
import yaml from 'js-yaml'

const REGISTRY_DATA_KEY = 'liquid-labs/liq-core:registry-data'

const determineRegistryData = async({ app, cache, update }) => {
  const cachedData = cache.get(REGISTRY_DATA_KEY)

  if (cachedData === undefined || update === true) {
    const data = {}
    for (const { url: registryURL } of app.ext.serverSettings.registries || []) {
      let text
      try {
        const response = await fetch('https://' + registryURL)
        text = await response.text()
      }
      catch (e) {
        throw createError.InternalServerError('Could not load registry data.', { cause : e })
      }
      let json
      try {
        json = registryURL.endsWith('.yaml') ? yaml.load(text) : JSON.parse(text)
      }
      catch (e) {
        throw createError.BadRequest(`Registry at https://${registryURL} does not parse as JSON.`, { cause : e })
      }
      const id = json?.meta?.id // TODO: verify using ajv
      if (id === undefined) {
        throw createError.BadRequest(`Registry at https://${registryURL} does not define 'meta.id'.`)
      }
      data[json.meta.id] = json
    }

    cache.put(REGISTRY_DATA_KEY, data)

    return data
  }
  else {
    return cachedData
  }
}

export { determineRegistryData, REGISTRY_DATA_KEY }
