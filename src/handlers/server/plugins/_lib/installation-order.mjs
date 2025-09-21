import { DepGraph } from 'dependency-graph'
import { getPackageOrgBasenameAndVersion } from '@liquid-labs/npm-toolkit'
import fs from 'fs/promises'
import yaml from 'yaml'
import path from 'path'
import { PluginError } from './error-utils'

// Resource limits to prevent DoS attacks
const MAX_TOTAL_PACKAGES = 500
const MAX_DEPENDENCIES_PER_PACKAGE = 100
const MAX_ITERATIONS = 1000

/**
 * Validates the entire dependency graph for circular dependencies
 * @param {Map} dependencyMap - Complete dependency mapping
 * @throws {Error} If any circular dependencies are found
 */
const validateNoCycles = (dependencyMap) => {
  const visiting = new Set()
  const visited = new Set()

  const dfs = (packageName, path = []) => {
    if (visiting.has(packageName)) {
      const cycleStart = path.indexOf(packageName)
      const cycle = path.slice(cycleStart).concat([packageName])
      throw PluginError.dependency(
        `Circular dependency detected: ${cycle.join(' → ')}`,
        cycle,
        packageName
      )
    }

    if (visited.has(packageName)) {
      return // Already processed this branch
    }

    visiting.add(packageName)
    const dependencies = dependencyMap.get(packageName) || []

    for (const dep of dependencies) {
      dfs(dep, [...path, packageName])
    }

    visiting.delete(packageName)
    visited.add(packageName)
  }

  // Check all packages
  for (const packageName of dependencyMap.keys()) {
    if (!visited.has(packageName)) {
      dfs(packageName, [])
    }
  }
}

/**
 * Validates resource limits to prevent DoS attacks
 * @param {Map} dependencyMap - Complete dependency mapping
 * @throws {Error} If resource limits are exceeded
 */
const validateResourceLimits = (dependencyMap) => {
  if (dependencyMap.size > MAX_TOTAL_PACKAGES) {
    throw PluginError.resourceLimit(
      'Total package count',
      dependencyMap.size,
      MAX_TOTAL_PACKAGES
    )
  }

  for (const [packageName, dependencies] of dependencyMap) {
    if (dependencies.length > MAX_DEPENDENCIES_PER_PACKAGE) {
      throw PluginError.resourceLimit(
        `Package ${packageName} dependencies`,
        dependencies.length,
        MAX_DEPENDENCIES_PER_PACKAGE,
        { packageName }
      )
    }
  }
}

/**
 * Determines the installation order for packages based on dependencies from plugable-express.yaml files
 * @param {Object} options - Installation order options
 * @param {Array} options.installedPlugins - Currently installed plugins
 * @param {boolean} options.noImplicitInstallation - Skip installation of implicit dependencies
 * @param {string} options.packageDir - Directory containing package installations
 * @param {Array} options.toInstall - Package names to install
 * @returns {Promise<Array>} Array of installation series (arrays of packages to install in each batch)
 */
const determineInstallationOrder = async({ installedPlugins, noImplicitInstallation, packageDir, toInstall }) => {
  const graph = new DepGraph()
  const processed = new Set()
  const toProcess = [...toInstall]
  const dependencyMap = new Map() // Track all dependencies for cycle detection
  let iterations = 0

  /**
   * Reads dependencies from a package's plugable-express.yaml file
   * Security: Uses safe YAML parsing to prevent deserialization attacks
   * @param {string} packageName - Package name (must be valid npm package name)
   * @returns {Promise<Array>} Array of dependency package names (with optional version specs)
   */
  const readPackageDependencies = async(packageName) => {
    const yamlPath = path.resolve(packageDir, packageName, 'plugable-express.yaml')

    let yamlContent
    try {
      yamlContent = await fs.readFile(yamlPath, 'utf8')
    }
    catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, no dependencies - this is OK
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

      const config = yaml.parse(yamlContent, {
        schema        : 'core', // Restricts to core YAML types only (no custom types)
        maxAliasCount : 100, // Prevents billion laughs attack
        prettyErrors  : false // Prevents potential info leakage in error messages
      })

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

      // Normalize dependencies to string format (supports both string and object format)
      return rawDependencies.map(dep => {
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

  // Process dependencies iteratively to avoid infinite loops
  while (toProcess.length > 0) {
    iterations++
    if (iterations > MAX_ITERATIONS) {
      throw PluginError.resourceLimit(
        'Dependency resolution iterations',
        iterations,
        MAX_ITERATIONS,
        { hint : 'Possible circular dependency or excessive dependency chain' }
      )
    }

    const packageToInstall = toProcess.shift()

    if (processed.has(packageToInstall)) {
      continue
    }
    processed.add(packageToInstall)

    if (!graph.hasNode(packageToInstall)) {
      graph.addNode(packageToInstall)
    }

    const { name } = await getPackageOrgBasenameAndVersion(packageToInstall)

    // Skip dependency processing if noImplicitInstallation is true
    if (noImplicitInstallation) {
      continue
    }

    const dependencies = await readPackageDependencies(name)

    // Store dependencies for cycle detection
    dependencyMap.set(packageToInstall, dependencies)

    // Validate resource limits
    validateResourceLimits(dependencyMap)

    for (const dependency of dependencies) {
      // Extract base package name for comparison with installed plugins
      const { name: depBaseName } = await getPackageOrgBasenameAndVersion(dependency)

      if (installedPlugins.some(({ npmName }) => npmName === depBaseName) || processed.has(dependency)) {
        continue
      }

      if (!graph.hasNode(dependency)) {
        graph.addNode(dependency)
        toProcess.push(dependency)
      }

      // Check for immediate circular dependency before adding to graph
      try {
        graph.addDependency(packageToInstall, dependency)
      }
      catch (error) {
        if (error.message.includes('Cyclic dependency')) {
          throw PluginError.dependency(
            `Circular dependency detected between ${packageToInstall} and ${dependency}`,
            [packageToInstall, dependency, packageToInstall],
            packageToInstall
          )
        }
        throw error
      }
    }
  }

  // Final validation: check entire dependency map for complex cycles
  validateNoCycles(dependencyMap)

  const installSeries = []
  while (graph.size() > 0) {
    try {
      const series = graph.overallOrder(true)
      installSeries.push(series)

      for (const pkg of series) {
        graph.removeNode(pkg)
      }
    }
    catch (error) {
      if (error.message.includes('Cyclic dependency')) {
        throw PluginError.dependency(
          'Circular dependency detected in installation order'
        )
      }
      throw error
    }
  }

  return installSeries
}

export { determineInstallationOrder }
