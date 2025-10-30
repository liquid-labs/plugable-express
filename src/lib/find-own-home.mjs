import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import findRoot from 'find-root'

/**
 * Finds the package root directory of the currently running server executable.
 *
 * This function is used to locate where core plugins should be loaded from. It handles both
 * regular executable paths and symlinked executables (e.g., when installed globally or via npm link).
 *
 * The function attempts two strategies:
 * 1. First, tries to find the package root directly from the executable path using `findRoot()`
 * 2. If that fails, resolves any symlinks using `fs.realpath()` and tries again
 *
 * @param {string} executablePath - The path to the executable (typically `process.argv[1]`)
 * @returns {Promise<string>} The absolute path to the server package root directory
 * @throws {Error} If executablePath is undefined, null, or empty
 * @throws {Error} If package.json cannot be found in any parent directory
 * @throws {Error} If the resolved package root doesn't contain a package.json file
 *
 * @example
 * // Direct executable path
 * const root = await findOwnHome('/usr/local/lib/node_modules/my-server/dist/server.js')
 * // Returns: '/usr/local/lib/node_modules/my-server'
 *
 * @example
 * // Symlinked executable (e.g., via npm link or global install)
 * const root = await findOwnHome('/usr/local/bin/my-server')
 * // Resolves symlink, then returns: '/home/user/projects/my-server'
 */
const findOwnHome = async(executablePath) => {
  if (!executablePath) {
    throw new Error('Cannot determine server package root: executablePath is undefined, null, or empty')
  }

  let serverPackageRoot

  // First attempt: try to find root from the executable path directly
  try {
    serverPackageRoot = findRoot(executablePath)
    const serverPackageJsonPath = fsPath.join(serverPackageRoot, 'package.json')
    if (!existsSync(serverPackageJsonPath)) {
      serverPackageRoot = null // Force fallback to symlink resolution
    }
  }
  catch (error) {
    // findRoot failed, will try symlink resolution
    serverPackageRoot = null
  }

  // Second attempt: if the executable is a symlink, resolve it and try again
  if (!serverPackageRoot) {
    try {
      // Resolve symlinks recursively using fs.realpath
      const realPath = await fs.realpath(executablePath)
      if (realPath !== executablePath) {
        // It was a symlink, try finding root from the real path
        serverPackageRoot = findRoot(realPath)
        const serverPackageJsonPath = fsPath.join(serverPackageRoot, 'package.json')
        if (!existsSync(serverPackageJsonPath)) {
          throw new Error(`Package root found at '${serverPackageRoot}' but package.json does not exist`)
        }
      }
      else {
        throw new Error(`Could not find package.json in any parent directory of '${executablePath}'`)
      }
    }
    catch (error) {
      throw new Error(`Could not determine server package root from '${executablePath}': ${error.message}`)
    }
  }

  return serverPackageRoot
}

export { findOwnHome }
