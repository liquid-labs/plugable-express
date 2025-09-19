import * as fs from 'node:fs/promises'

import createError from 'http-errors'
import yaml from 'js-yaml'

const REGISTRY_DATA_KEY = 'liquid-labs/liq-core:registry-data'

/**
 * Determines and loads registry data from configured registries
 * @param {Object} options - Configuration options
 * @param {Object} options.cache - Cache object for storing registry data
 * @param {Array<string>} options.registries - Array of registry URLs to load from
 * @param {Object} options.reporter - Reporter for logging
 * @param {boolean} options.update - Whether to force update the cache
 * @returns {Promise<Object>} Registry data keyed by registry ID
 */
const determineRegistryData = async({ cache, registries = [], reporter, update }) => {
  const cachedData = cache.get(REGISTRY_DATA_KEY)

  if (cachedData === undefined || update === true) {
    reporter?.log(`Loading data from ${registries.length} registries...`)
    const data = {}
    for (const registryURL of registries) {
      reporter?.log(`Loading data from registry: ${registryURL}`)

      let text
      if (registryURL.startsWith('file:')) {
        text = await fs.readFile(registryURL.slice(5))
      }
      else {
        try {
          const response = await fetch(registryURL)
          text = await response.text()
        }
        catch (e) {
          throw createError.InternalServerError(`Could not load registry data from ${registryURL}: ${e.message}`, { cause : e })
        }
      }

      let json
      try {
        json = registryURL.endsWith('.yaml') ? yaml.load(text) : JSON.parse(text)
      }
      catch (e) {
        throw createError.BadRequest(`Registry ${registryURL} does not parse as ${registryURL.endsWith('.yaml') ? 'YAML' : 'JSON'}.`, { cause : e })
      }
      const id = json?.meta?.id
      if (id === undefined) {
        throw createError.BadRequest(`Registry ${registryURL} does not define 'meta.id'.`)
      }
      data[json.meta.id] = json
    }

    cache.put(REGISTRY_DATA_KEY, data)
    return data
  }
  else {
    reporter?.log('Loading registries data from cache...')
    return cachedData
  }
}

export { determineRegistryData, REGISTRY_DATA_KEY }
