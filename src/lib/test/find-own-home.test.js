/* global afterEach beforeEach describe expect jest test */

import * as fsPath from 'node:path'

import findRoot from 'find-root'

import { findOwnHome } from '../find-own-home'

// Mock modules
jest.mock('find-root')
jest.mock('node:fs', () => ({
  existsSync : jest.fn()
}))
jest.mock('node:fs/promises', () => ({
  realpath : jest.fn()
}))

// We need to import after mocking
const { existsSync } = require('node:fs')
const fs = require('node:fs/promises')

describe('findOwnHome', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('direct executable path (non-symlink)', () => {
    test('finds package root when package.json exists', async() => {
      const execPath = '/usr/local/lib/node_modules/my-server/dist/server.js'
      const expectedRoot = '/usr/local/lib/node_modules/my-server'
      const packageJsonPath = fsPath.join(expectedRoot, 'package.json')

      findRoot.mockReturnValue(expectedRoot)
      existsSync.mockImplementation((path) => path === packageJsonPath)

      const result = await findOwnHome(execPath)

      expect(result).toBe(expectedRoot)
      expect(findRoot).toHaveBeenCalledWith(execPath)
      expect(existsSync).toHaveBeenCalledWith(packageJsonPath)
    })

    test('falls back to symlink resolution when package.json does not exist in found root', async() => {
      const execPath = '/some/path/server.js'
      const wrongRoot = '/some/path'
      const realPath = '/actual/server/dist/server.js'
      const expectedRoot = '/actual/server'
      const packageJsonPath = fsPath.join(expectedRoot, 'package.json')

      // First call returns a root but package.json doesn't exist there
      findRoot.mockReturnValueOnce(wrongRoot)
      existsSync.mockImplementation((path) => {
        if (path === fsPath.join(wrongRoot, 'package.json')) return false
        if (path === packageJsonPath) return true
        return false
      })

      // Mock fs.realpath to return a different path (simulating symlink)
      fs.realpath.mockResolvedValue(realPath)

      // Second call to findRoot with the real path
      findRoot.mockReturnValueOnce(expectedRoot)

      const result = await findOwnHome(execPath)

      expect(result).toBe(expectedRoot)
      expect(fs.realpath).toHaveBeenCalledWith(execPath)
      expect(findRoot).toHaveBeenCalledWith(realPath)
    })
  })

  describe('symlinked executable path', () => {
    test('resolves symlink and finds package root', async() => {
      const symlinkPath = '/usr/local/bin/my-server'
      const realPath = '/home/user/projects/my-server/dist/server.js'
      const expectedRoot = '/home/user/projects/my-server'
      const packageJsonPath = fsPath.join(expectedRoot, 'package.json')

      // First attempt with symlink path fails
      findRoot.mockImplementationOnce(() => {
        throw new Error('Could not find package.json')
      })

      // Mock fs.realpath to resolve the symlink
      fs.realpath.mockResolvedValue(realPath)

      // Second attempt with real path succeeds
      findRoot.mockReturnValueOnce(expectedRoot)
      existsSync.mockImplementation((path) => path === packageJsonPath)

      const result = await findOwnHome(symlinkPath)

      expect(result).toBe(expectedRoot)
      expect(fs.realpath).toHaveBeenCalledWith(symlinkPath)
      expect(findRoot).toHaveBeenNthCalledWith(2, realPath)
    })

    test('handles multi-level symlinks (fs.realpath resolves all)', async() => {
      const symlinkPath = '/usr/local/bin/server'
      const finalRealPath = '/opt/app/my-server/bin/server.js'
      const expectedRoot = '/opt/app/my-server'
      const packageJsonPath = fsPath.join(expectedRoot, 'package.json')

      // First attempt fails
      findRoot.mockImplementationOnce(() => {
        throw new Error('Could not find package.json')
      })

      // fs.realpath resolves all symlink levels at once
      fs.realpath.mockResolvedValue(finalRealPath)

      // Second attempt succeeds with the final real path
      findRoot.mockReturnValueOnce(expectedRoot)
      existsSync.mockImplementation((path) => path === packageJsonPath)

      const result = await findOwnHome(symlinkPath)

      expect(result).toBe(expectedRoot)
      expect(fs.realpath).toHaveBeenCalledWith(symlinkPath)
      expect(findRoot).toHaveBeenCalledWith(finalRealPath)
    })
  })

  describe('error handling', () => {
    test('throws error when executablePath is undefined', async() => {
      await expect(findOwnHome(undefined)).rejects.toThrow(
        'Cannot determine server package root: executablePath is undefined, null, or empty'
      )
    })

    test('throws error when executablePath is null', async() => {
      await expect(findOwnHome(null)).rejects.toThrow(
        'Cannot determine server package root: executablePath is undefined, null, or empty'
      )
    })

    test('throws error when executablePath is empty string', async() => {
      await expect(findOwnHome('')).rejects.toThrow(
        'Cannot determine server package root: executablePath is undefined, null, or empty'
      )
    })

    test('throws error when package.json cannot be found anywhere', async() => {
      const execPath = '/some/invalid/path.js'

      findRoot.mockImplementation(() => {
        throw new Error('Could not find package.json')
      })

      fs.realpath.mockResolvedValue(execPath) // Not a symlink

      await expect(findOwnHome(execPath)).rejects.toThrow(
        "Could not determine server package root from '/some/invalid/path.js'"
      )
    })

    test('throws error when resolved symlink path has no package.json', async() => {
      const symlinkPath = '/usr/bin/server'
      const realPath = '/opt/server/bin/exec.js'
      const foundRoot = '/opt/server'

      findRoot.mockImplementationOnce(() => {
        throw new Error('No package.json in symlink path')
      })

      fs.realpath.mockResolvedValue(realPath)

      findRoot.mockReturnValueOnce(foundRoot)
      existsSync.mockReturnValue(false) // package.json doesn't exist

      await expect(findOwnHome(symlinkPath)).rejects.toThrow(
        `Package root found at '${foundRoot}' but package.json does not exist`
      )
    })

    test('provides helpful error message on unexpected errors', async() => {
      const execPath = '/some/path/server.js'
      const unexpectedError = new Error('Filesystem error')

      findRoot.mockImplementation(() => {
        throw unexpectedError
      })

      fs.realpath.mockRejectedValue(unexpectedError)

      await expect(findOwnHome(execPath)).rejects.toThrow(
        "Could not determine server package root from '/some/path/server.js': Filesystem error"
      )
    })
  })

  describe('edge cases', () => {
    test('handles path when realpath returns same path (not a symlink)', async() => {
      const execPath = '/direct/path/to/server.js'
      const root = '/direct/path/to'
      const packageJsonPath = fsPath.join(root, 'package.json')

      findRoot.mockReturnValue(root)
      existsSync.mockImplementation((path) => path === packageJsonPath)

      const result = await findOwnHome(execPath)

      expect(result).toBe(root)
      // Should not call fs.realpath since direct attempt succeeded
      expect(fs.realpath).not.toHaveBeenCalled()
    })

    test('uses realpath result when it differs from original', async() => {
      const symlinkPath = '/usr/bin/myapp'
      const realPath = '/opt/myapp/bin/start.js'
      const expectedRoot = '/opt/myapp'

      findRoot.mockImplementationOnce(() => {
        throw new Error('Cannot find root')
      })

      fs.realpath.mockResolvedValue(realPath)

      findRoot.mockReturnValueOnce(expectedRoot)
      existsSync.mockReturnValue(true)

      const result = await findOwnHome(symlinkPath)

      expect(result).toBe(expectedRoot)
      expect(findRoot).toHaveBeenCalledWith(realPath)
    })
  })
})
