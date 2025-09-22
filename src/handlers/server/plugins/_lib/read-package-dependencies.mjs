import fs from 'fs/promises'
import yaml from 'yaml'
import path from 'path'
import { PluginError } from './error-utils'

/**
 * Reads dependencies from a package's plugable-express.yaml file
 * Security: Uses safe YAML parsing to prevent deserialization attacks
 * @param {string} packageName - Package name (must be valid npm package name)
 * @returns {Promise<Array>} Array of dependency package names (with optional version specs)
 */
const readPackageDependencies = async(packageName, packageDir) => {
  console.log(`Reading plugable-express dependencies for ${packageName} from ${packageDir}...`) // DEBUG
  const yamlPath = path.resolve(packageDir, 'node_modules', packageName, 'plugable-express.yaml')
  reporter?.log(`Reading plugable-express dependencies for ${packageName} from ${yamlPath}...`)

  let yamlContent
  try {
    yamlContent = await fs.readFile(yamlPath, 'utf8')
  }
  catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, no dependencies - this is OK
      reporter?.log(`No plugable-express.yaml file found for ${packageName}`)
      console.log(`No plugable-express.yaml file found for ${packageName}`) // DEBUG
      return []
    }
    else if (error.code === 'EACCES') {
      throw PluginError.access(
        `Cannot access 'plugable-express.yaml' for package '${packageName}'; permission denied`,
        error
      )
    }
    else {
      // Re-throw other unexpected file system errors as server errors
      throw PluginError.internal(
        `Unexpected error reading plugable-express.yaml for package '${packageName}'`,
        error,
        false // Don't expose internal details
      )
    }
  }

  // Parse YAML content with security restrictions
  try {
    // Validate YAML content size before parsing (10KB limit)
    if (yamlContent.length > 10000) {
      throw PluginError.resourceLimit(
        'YAML file size',
        yamlContent.length,
        10000,
        { packageName, filePath : 'plugable-express.yaml' }
      )
    }

    reporter?.log(`yamlContent: ${yamlContent}`) // DEBUG

    const config = yaml.parse(yamlContent, {
      schema        : 'core', // Restricts to core YAML types only (no custom types)
      maxAliasCount : 100, // Prevents billion laughs attack
      prettyErrors  : false // Prevents potential info leakage in error messages
    })

    reporter?.log(`parsed config: ${JSON.stringify(config)}`) // DEBUG

    // Validate parsed structure
    if (config && typeof config !== 'object') {
      throw PluginError.validation(
        'YAML structure',
        typeof config,
        'object (root element must be an object)',
        { packageName, filePath : 'plugable-express.yaml' }
      )
    }

    const rawDependencies = config.dependencies || []
    reporter?.log(`Found ${rawDependencies.length} dependencies for ${packageName}`) // DEBUG

    // Normalize dependencies to string format (supports both string and object format)
    // return rawDependencies.map(dep => {
    const normalizedDependencies = rawDependencies.map(dep => {
      if (typeof dep === 'string') {
        return dep
      }
      else if (typeof dep === 'object' && dep.npmPackage) {
        return dep.version ? `${dep.npmPackage}@${dep.version}` : dep.npmPackage
      }
      else {
        throw PluginError.validation(
          'dependency format',
          JSON.stringify(dep),
          'string or {npmPackage: string, version?: string}',
          {
            packageName,
            invalidDependency : dep,
            validExamples     : [
              'package-name',
              '{"npmPackage": "package-name", "version": "^1.0.0"}'
            ]
          }
        )
      }
    })
    return normalizedDependencies
  }
  catch (error) {
    if (error && error.status) throw error // Re-throw our own errors
    // YAML parsing errors
    throw PluginError.parsing(
      `plugable-express.yaml (package: ${packageName})`,
      error,
      true // Expose parsing errors to help users fix their YAML
    )
  }
}

export { readPackageDependencies }
