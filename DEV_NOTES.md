# Dev Notes

* 'find-plugins (as of 1.1.7) has to be left as an external... I think. But didn't note why exactly at the time.

## TODO

### Comprehensive Security Test Coverage

#### Context
**Priority:** HIGH - Essential for preventing security vulnerabilities in production
**Issue:** Missing test coverage for security-focused scenarios
**Location:** Test suites throughout the plugin system

#### Problem Description
The current test suite covers functional scenarios well but lacks comprehensive security-focused testing:
- No tests for malicious YAML attacks (billion laughs, code execution)
- No tests for path traversal attack vectors
- No tests for resource exhaustion scenarios
- No tests for malformed input edge cases
- No integration security testing

**Security testing gaps:**
- YAML deserialization attack vectors
- File system path traversal attempts
- Resource exhaustion (DoS) scenarios
- Input validation bypass attempts
- Error message information leakage
- Concurrent access security issues

#### Steps to Fix

##### 1. Create Security Test Framework
Build dedicated security testing utilities:

**File:** `src/handlers/server/plugins/_lib/test/security-test-utils.js`
```javascript
import fs from 'fs/promises'
import path from 'path'

/**
 * Security testing utilities for the plugin system
 */

export const SecurityTestUtils = {
  /**
   * Common path traversal attack payloads
   */
  pathTraversalPayloads: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    './../../secret.txt',
    'package/../../../etc/hosts',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', // URL encoded
    '....//....//....//etc//passwd', // Double encoding
    'package/../../etc/passwd',
    '.\\..\\..\\..\\windows\\system32',
    'node_modules/../../../etc/passwd'
  ],

  /**
   * Malicious YAML payloads for testing deserialization attacks
   */
  maliciousYamlPayloads: {
    billionLaughs: `
a: &a ["lol","lol","lol","lol","lol","lol","lol","lol","lol"]
b: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]
c: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]
d: &d [*c,*c,*c,*c,*c,*c,*c,*c,*c]
e: &e [*d,*d,*d,*d,*d,*d,*d,*d,*d]
dependencies: *e
`,
    excessiveAliases: Array.from({length: 200}, (_, i) => `alias${i}: &alias${i} "value"`).join('\n') +
      '\ndependencies:\n' + Array.from({length: 200}, (_, i) => `  - *alias${i}`).join('\n'),

    deepNesting: 'dependencies:' + '    - nested:'.repeat(100) + ' "deep"',

    hugeDependencyList: `dependencies:\n${Array.from({length: 10000}, (_, i) => `  - package-${i}`).join('\n')}`,

    invalidStructures: [
      'dependencies: !!js/function "function(){return 1;}"', // Code execution attempt
      'dependencies: !!python/object/apply:os.system ["echo vulnerable"]', // Python execution
      'dependencies: <<: *unknown_alias', // Invalid alias reference
      'dependencies:\n  - !!binary "malicious content"', // Binary content
      'dependencies: &circular_ref [*circular_ref]' // Self-referential alias
    ]
  },

  /**
   * Invalid package name payloads
   */
  invalidPackageNames: [
    '', // Empty
    ' ', // Whitespace only
    'package with spaces',
    'UPPERCASE_PACKAGE',
    'package@with@multiple@ats',
    'package/with/slashes',
    'package\\with\\backslashes',
    '../../../etc/passwd',
    'package..name',
    'package.json',
    'node_modules',
    '.',
    '..',
    'package-name-' + 'x'.repeat(300), // Extremely long name
    'package\x00null', // Null bytes
    'package\n newline',
    'package\r carriage',
    'package\t tab',
    String.fromCharCode(0x202E) + 'package', // Unicode right-to-left override
    'package' + String.fromCharCode(0xFEFF), // Zero-width no-break space
    '‹script›alert("xss")‹/script›' // XSS attempt in package name
  ],

  /**
   * Creates a temporary directory for security tests
   */
  async createSecureTestDir() {
    const testDir = path.join(process.cwd(), 'temp-security-test')
    await fs.mkdir(testDir, { recursive: true })
    return testDir
  },

  /**
   * Cleans up temporary test directories
   */
  async cleanupTestDir(testDir) {
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch (error) {
      console.warn(`Failed to cleanup test directory: ${error.message}`)
    }
  },

  /**
   * Creates a malicious YAML file for testing
   */
  async createMaliciousYamlFile(testDir, packageName, yamlContent) {
    const packageDir = path.join(testDir, packageName)
    await fs.mkdir(packageDir, { recursive: true })
    const yamlPath = path.join(packageDir, 'plugable-express.yaml')
    await fs.writeFile(yamlPath, yamlContent, 'utf8')
    return yamlPath
  },

  /**
   * Measures resource usage during test execution
   */
  measureResourceUsage: (asyncFunction) => {
    return async (...args) => {
      const startMemory = process.memoryUsage()
      const startTime = Date.now()

      try {
        const result = await asyncFunction(...args)
        return {
          result,
          resourceUsage: {
            duration: Date.now() - startTime,
            memoryDelta: {
              rss: process.memoryUsage().rss - startMemory.rss,
              heapUsed: process.memoryUsage().heapUsed - startMemory.heapUsed
            }
          }
        }
      } catch (error) {
        return {
          error,
          resourceUsage: {
            duration: Date.now() - startTime,
            memoryDelta: {
              rss: process.memoryUsage().rss - startMemory.rss,
              heapUsed: process.memoryUsage().heapUsed - startMemory.heapUsed
            }
          }
        }
      }
    }
  },

  /**
   * Tests for information leakage in error messages
   */
  checkErrorMessageSafety: (error, sensitiveInfo = []) => {
    const errorMessage = error.message || error.toString()
    const leakedInfo = []

    // Check for common sensitive information patterns
    const patterns = [
      /\/[a-zA-Z0-9\/._-]*\/etc\/passwd/g, // File paths
      /\/[a-zA-Z0-9\/._-]*\/home\/[a-zA-Z0-9._-]+/g, // Home directories
      /[a-zA-Z]:[\\\/][a-zA-Z0-9\\\/._-]*windows[\\\/]system32/gi, // Windows paths
      /password[s]?[:=]\s*[a-zA-Z0-9]+/gi, // Passwords
      /token[:=]\s*[a-zA-Z0-9]+/gi, // Tokens
      /key[:=]\s*[a-zA-Z0-9]+/gi, // Keys
      ...sensitiveInfo.map(info => new RegExp(info.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'gi'))
    ]

    patterns.forEach((pattern, index) => {
      const matches = errorMessage.match(pattern)
      if (matches) {
        leakedInfo.push({
          pattern: pattern.toString(),
          matches: matches,
          type: ['file_paths', 'home_dirs', 'windows_paths', 'passwords', 'tokens', 'keys'][index] || 'custom'
        })
      }
    })

    return {
      safe: leakedInfo.length === 0,
      leakedInfo,
      errorMessage
    }
  }
}
```

##### 2. Create YAML Security Tests
Comprehensive tests for YAML parsing vulnerabilities:

**File:** `src/handlers/server/plugins/_lib/test/yaml-security.test.js`
```javascript
import { determineInstallationOrder } from '../installation-order'
import { SecurityTestUtils } from './security-test-utils'
import fs from 'fs/promises'

describe('YAML Security Tests', () => {
  let testDir

  beforeEach(async() => {
    testDir = await SecurityTestUtils.createSecureTestDir()
  })

  afterEach(async() => {
    await SecurityTestUtils.cleanupTestDir(testDir)
  })

  describe('billion laughs attack protection', () => {
    test('prevents billion laughs YAML attack', async() => {
      await SecurityTestUtils.createMaliciousYamlFile(
        testDir,
        'malicious-package',
        SecurityTestUtils.maliciousYamlPayloads.billionLaughs
      )

      const testWithTimeout = SecurityTestUtils.measureResourceUsage(determineInstallationOrder)

      const { error, resourceUsage } = await testWithTimeout({
        installedPlugins: [],
        packageDir: testDir,
        toInstall: ['malicious-package']
      })

      expect(error).toBeDefined()
      expect(error.message).toMatch(/too many aliases|parsing error/i)
      expect(resourceUsage.duration).toBeLessThan(5000) // Should fail quickly
      expect(resourceUsage.memoryDelta.heapUsed).toBeLessThan(100 * 1024 * 1024) // < 100MB
    })

    test('prevents excessive alias usage', async() => {
      await SecurityTestUtils.createMaliciousYamlFile(
        testDir,
        'alias-bomb',
        SecurityTestUtils.maliciousYamlPayloads.excessiveAliases
      )

      await expect(determineInstallationOrder({
        installedPlugins: [],
        packageDir: testDir,
        toInstall: ['alias-bomb']
      })).rejects.toThrow(/too many aliases|resource limit/i)
    })
  })

  describe('YAML structure attacks', () => {
    test('prevents deep nesting attacks', async() => {
      await SecurityTestUtils.createMaliciousYamlFile(
        testDir,
        'deep-nesting',
        SecurityTestUtils.maliciousYamlPayloads.deepNesting
      )

      await expect(determineInstallationOrder({
        installedPlugins: [],
        packageDir: testDir,
        toInstall: ['deep-nesting']
      })).rejects.toThrow(/parsing error|invalid structure/i)
    })

    test('prevents huge dependency lists', async() => {
      await SecurityTestUtils.createMaliciousYamlFile(
        testDir,
        'huge-deps',
        SecurityTestUtils.maliciousYamlPayloads.hugeDependencyList
      )

      await expect(determineInstallationOrder({
        installedPlugins: [],
        packageDir: testDir,
        toInstall: ['huge-deps']
      })).rejects.toThrow(/too large|resource limit|too many dependencies/i)
    })

    test('rejects code execution attempts', async() => {
      for (const [index, maliciousYaml] of SecurityTestUtils.maliciousYamlPayloads.invalidStructures.entries()) {
        await SecurityTestUtils.createMaliciousYamlFile(
          testDir,
          `code-exec-${index}`,
          maliciousYaml
        )

        await expect(determineInstallationOrder({
          installedPlugins: [],
          packageDir: testDir,
          toInstall: [`code-exec-${index}`]
        })).rejects.toThrow(/parsing error|invalid/i)
      }
    })
  })

  describe('file size limits', () => {
    test('rejects oversized YAML files', async() => {
      const hugeDependencies = 'dependencies:\n' + '  - package-name\n'.repeat(50000)

      await SecurityTestUtils.createMaliciousYamlFile(
        testDir,
        'huge-file',
        hugeDependencies
      )

      await expect(determineInstallationOrder({
        installedPlugins: [],
        packageDir: testDir,
        toInstall: ['huge-file']
      })).rejects.toThrow(/too large|file size/i)
    })
  })
})
```

##### 3. Create Path Traversal Security Tests
Comprehensive tests for file system security:

**File:** `src/handlers/server/plugins/_lib/test/path-security.test.js`
```javascript
import { determineInstallationOrder } from '../installation-order'
import { SecurityTestUtils } from './security-test-utils'

describe('Path Traversal Security Tests', () => {
  describe('package name validation', () => {
    test('blocks all path traversal attempts', async() => {
      for (const maliciousName of SecurityTestUtils.pathTraversalPayloads) {
        await expect(determineInstallationOrder({
          installedPlugins: [],
          packageDir: '/safe/directory',
          toInstall: [maliciousName]
        })).rejects.toThrow(/invalid package name|path traversal|validation/i)

        // Verify error message doesn't leak sensitive paths
        try {
          await determineInstallationOrder({
            installedPlugins: [],
            packageDir: '/safe/directory',
            toInstall: [maliciousName]
          })
          fail('Should have thrown error')
        } catch (error) {
          const safety = SecurityTestUtils.checkErrorMessageSafety(error, ['/safe/directory'])
          expect(safety.safe).toBe(true)
        }
      }
    })

    test('blocks invalid package name formats', async() => {
      for (const invalidName of SecurityTestUtils.invalidPackageNames) {
        await expect(determineInstallationOrder({
          installedPlugins: [],
          packageDir: '/test',
          toInstall: [invalidName]
        })).rejects.toThrow(/invalid package name|validation/i)
      }
    })
  })

  describe('file system protection', () => {
    test('prevents access outside package directory', async() => {
      // Even if package name validation is bypassed, path resolution should be safe
      const maliciousPackages = [
        'package', // But we'll mock the file path to be dangerous
        'normal-looking-package'
      ]

      // Mock path.resolve to simulate a bypass attempt
      const originalResolve = require('path').resolve
      require('path').resolve = jest.fn().mockImplementation((...paths) => {
        if (paths.includes('package')) {
          return '/etc/passwd' // Simulate path traversal
        }
        return originalResolve(...paths)
      })

      try {
        for (const packageName of maliciousPackages) {
          await expect(determineInstallationOrder({
            installedPlugins: [],
            packageDir: '/safe/dir',
            toInstall: [packageName]
          })).rejects.toThrow(/path traversal|outside.*directory|security/i)
        }
      } finally {
        require('path').resolve = originalResolve
      }
    })
  })
})
```

##### 4. Create Resource Exhaustion Tests
Tests for DoS prevention:

**File:** `src/handlers/server/plugins/_lib/test/resource-security.test.js`
```javascript
import { determineInstallationOrder } from '../installation-order'
import { SecurityTestUtils } from './security-test-utils'

describe('Resource Exhaustion Security Tests', () => {
  describe('dependency graph limits', () => {
    test('prevents excessive package counts', async() => {
      const tooManyPackages = Array.from({length: 1000}, (_, i) => `package-${i}`)

      await expect(determineInstallationOrder({
        installedPlugins: [],
        packageDir: '/test',
        toInstall: tooManyPackages
      })).rejects.toThrow(/too many|resource limit|maximum.*packages/i)
    })

    test('prevents deep dependency chains', async() => {
      // Create a dependency chain that's too deep
      const packageName = 'deep-chain-root'

      // Mock file reads to create deep chain
      jest.spyOn(require('fs/promises'), 'readFile').mockImplementation(async(path) => {
        const match = path.match(/package-(\d+)/)
        if (match) {
          const depth = parseInt(match[1])
          if (depth > 100) { // Should be rejected before this
            return 'dependencies: []'
          }
          return `dependencies:\n  - package-${depth + 1}`
        }
        return `dependencies:\n  - package-1`
      })

      await expect(determineInstallationOrder({
        installedPlugins: [],
        packageDir: '/test',
        toInstall: [packageName]
      })).rejects.toThrow(/depth.*limit|too deep|resource/i)
    })

    test('prevents circular dependency resource exhaustion', async() => {
      // Test that circular dependencies are caught before resource exhaustion
      jest.spyOn(require('fs/promises'), 'readFile').mockImplementation(async(path) => {
        if (path.includes('package-a')) {
          return 'dependencies:\n  - package-b'
        }
        if (path.includes('package-b')) {
          return 'dependencies:\n  - package-c'
        }
        if (path.includes('package-c')) {
          return 'dependencies:\n  - package-a' // Creates cycle
        }
        return 'dependencies: []'
      })

      const testWithResourceMonitoring = SecurityTestUtils.measureResourceUsage(determineInstallationOrder)

      const { error, resourceUsage } = await testWithResourceMonitoring({
        installedPlugins: [],
        packageDir: '/test',
        toInstall: ['package-a']
      })

      expect(error).toBeDefined()
      expect(error.message).toMatch(/circular dependency|cycle/i)
      expect(resourceUsage.duration).toBeLessThan(1000) // Should fail quickly
    })
  })

  describe('concurrent access limits', () => {
    test('handles concurrent dependency resolution safely', async() => {
      const concurrentRequests = Array.from({length: 20}, (_, i) =>
        determineInstallationOrder({
          installedPlugins: [],
          packageDir: '/test',
          toInstall: [`package-${i}`]
        })
      )

      // Mock file operations to simulate normal packages
      jest.spyOn(require('fs/promises'), 'readFile').mockResolvedValue('dependencies: []')

      const results = await Promise.allSettled(concurrentRequests)

      // All should either succeed or fail gracefully
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          // Should be validation errors, not crashes
          expect(result.reason.message).toMatch(/validation|invalid|not found/i)
        }
      })

      // Should not cause memory leaks or crashes
      expect(process.memoryUsage().heapUsed).toBeLessThan(500 * 1024 * 1024) // < 500MB
    })
  })

  describe('memory usage limits', () => {
    test('prevents memory exhaustion from large data structures', async() => {
      const testFunction = SecurityTestUtils.measureResourceUsage(async() => {
        // Create scenario that could lead to memory exhaustion
        const largeInputs = {
          installedPlugins: Array.from({length: 10000}, (_, i) => ({ npmName: `installed-${i}` })),
          toInstall: Array.from({length: 100}, (_, i) => `package-${i}`)
        }

        return await determineInstallationOrder({
          ...largeInputs,
          packageDir: '/test'
        })
      })

      const { error, resourceUsage } = await testFunction()

      // Either should handle gracefully or reject with resource limits
      if (error) {
        expect(error.message).toMatch(/resource limit|too many|maximum/i)
      }

      // Memory usage should be bounded
      expect(resourceUsage.memoryDelta.heapUsed).toBeLessThan(200 * 1024 * 1024) // < 200MB
    })
  })
})
```

##### 5. Create Integration Security Tests
End-to-end security testing:

**File:** `src/handlers/server/plugins/_lib/test/integration-security.test.js`
```javascript
import { installPlugins } from '../install-plugins'
import { SecurityTestUtils } from './security-test-utils'

describe('Integration Security Tests', () => {
  describe('complete attack chain prevention', () => {
    test('prevents path traversal through entire pipeline', async() => {
      const maliciousApp = {
        ext: {
          devPaths: ['/dev'],
          handlerPlugins: []
        }
      }

      for (const maliciousName of SecurityTestUtils.pathTraversalPayloads.slice(0, 5)) {
        await expect(installPlugins({
          app: maliciousApp,
          installedPlugins: [],
          npmNames: [maliciousName],
          pluginPkgDir: '/plugins',
          reloadFunc: jest.fn(),
          reporter: { log: jest.fn() }
        })).rejects.toThrow(/invalid package name|validation|path traversal/i)
      }
    })

    test('handles malicious YAML in full installation flow', async() => {
      const testDir = await SecurityTestUtils.createSecureTestDir()

      try {
        await SecurityTestUtils.createMaliciousYamlFile(
          testDir,
          'malicious-plugin',
          SecurityTestUtils.maliciousYamlPayloads.billionLaughs
        )

        const mockApp = {
          ext: {
            devPaths: ['/dev'],
            handlerPlugins: []
          }
        }

        await expect(installPlugins({
          app: mockApp,
          installedPlugins: [],
          npmNames: ['malicious-plugin'],
          pluginPkgDir: testDir,
          reloadFunc: jest.fn(),
          reporter: { log: jest.fn() }
        })).rejects.toThrow(/parsing error|too many aliases|resource/i)

      } finally {
        await SecurityTestUtils.cleanupTestDir(testDir)
      }
    })
  })

  describe('error message security', () => {
    test('error messages do not leak sensitive information', async() => {
      const sensitiveDir = '/home/user/secret-project/plugins'
      const sensitivePackages = ['internal-secret-package', 'company-private-tool']

      const scenarios = [
        {
          name: 'invalid package name',
          params: {
            installedPlugins: [],
            npmNames: ['../../../etc/passwd'],
            pluginPkgDir: sensitiveDir
          }
        },
        {
          name: 'missing directory',
          params: {
            installedPlugins: [],
            npmNames: ['valid-package'],
            pluginPkgDir: '/nonexistent/secret/path'
          }
        }
      ]

      for (const scenario of scenarios) {
        try {
          await installPlugins({
            app: { ext: { devPaths: [] } },
            ...scenario.params,
            reloadFunc: jest.fn(),
            reporter: { log: jest.fn() }
          })
          fail(`Should have thrown error for ${scenario.name}`)
        } catch (error) {
          const safety = SecurityTestUtils.checkErrorMessageSafety(error, [
            sensitiveDir,
            ...sensitivePackages
          ])

          expect(safety.safe).toBe(true)

          if (!safety.safe) {
            console.error(`Information leakage in ${scenario.name}:`, safety.leakedInfo)
          }
        }
      }
    })
  })
})
```

##### 6. Add Security Test Configuration
Configuration for security testing:

**File:** `src/handlers/server/plugins/_lib/test/security.config.js`
```javascript
/**
 * Security testing configuration and constants
 */

export const SECURITY_TEST_CONFIG = {
  // Resource limits for testing
  limits: {
    maxTestDuration: 10000, // 10 seconds
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    maxFileOperations: 1000,
    maxConcurrentTests: 5
  },

  // Test data paths (use temporary directories)
  paths: {
    tempTestDir: 'temp-security-tests',
    maliciousYamlDir: 'malicious-yaml-samples'
  },

  // Security test categories
  categories: {
    CRITICAL: ['path_traversal', 'code_execution', 'information_disclosure'],
    HIGH: ['resource_exhaustion', 'yaml_bombs', 'input_validation'],
    MEDIUM: ['error_handling', 'concurrency', 'configuration']
  },

  // Test environment settings
  environment: {
    enablePerformanceMonitoring: true,
    logSecurityEvents: process.env.NODE_ENV === 'test',
    strictMode: true // Fail fast on any security issues
  }
}

/**
 * Security test helper for setup and teardown
 */
export class SecurityTestEnvironment {
  constructor() {
    this.tempDirs = new Set()
    this.originalFunctions = new Map()
  }

  async setup() {
    // Store original functions that might be mocked
    this.originalFunctions.set('fs.readFile', require('fs/promises').readFile)
    this.originalFunctions.set('path.resolve', require('path').resolve)

    // Set strict security mode
    process.env.SECURITY_TEST_MODE = 'true'
  }

  async teardown() {
    // Restore original functions
    for (const [name, originalFunc] of this.originalFunctions) {
      const [module, func] = name.split('.')
      require(module)[func] = originalFunc
    }

    // Clean up temporary directories
    const fs = require('fs/promises')
    for (const tempDir of this.tempDirs) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch (error) {
        console.warn(`Failed to cleanup ${tempDir}: ${error.message}`)
      }
    }

    delete process.env.SECURITY_TEST_MODE
  }

  trackTempDir(dirPath) {
    this.tempDirs.add(dirPath)
  }
}
```

#### Validation Steps
1. Run all security tests to ensure they catch vulnerabilities
2. Verify tests don't have false positives with valid inputs
3. Test performance impact of security checks
4. Validate error messages don't leak sensitive information
5. Test resource usage limits are effective

#### Files to Create
- `src/handlers/server/plugins/_lib/test/security-test-utils.js`
- `src/handlers/server/plugins/_lib/test/yaml-security.test.js`
- `src/handlers/server/plugins/_lib/test/path-security.test.js`
- `src/handlers/server/plugins/_lib/test/resource-security.test.js`
- `src/handlers/server/plugins/_lib/test/integration-security.test.js`
- `src/handlers/server/plugins/_lib/test/security.config.js`

#### Files to Modify
- `src/handlers/server/plugins/_lib/test/installation-order.test.js` (add security test imports)
- `src/handlers/server/plugins/_lib/test/install-plugins.test.js` (add security test imports)
- `package.json` (add security test scripts)

#### Success Criteria
- [ ] Comprehensive YAML attack vector testing (billion laughs, code execution)
- [ ] Complete path traversal attack prevention testing
- [ ] Resource exhaustion and DoS prevention testing
- [ ] Input validation bypass attempt testing
- [ ] Error message security (no information leakage) testing
- [ ] Integration security testing across the entire pipeline
- [ ] Performance impact measurement for security checks
- [ ] Automated security test execution in CI/CD
- [ ] Clear documentation of security test coverage
- [ ] Zero false positives with valid inputs

### TODO.05: Add Comprehensive Input Validation

#### Context
**Priority:** MEDIUM - Prevents runtime errors and improves robustness
**Issue:** Missing validation of input parameters and data types
**Location:** Multiple entry points in plugin management functions

#### Problem Description
The current implementation lacks comprehensive input validation, which can lead to:
- Runtime errors when unexpected data types are passed
- Unclear error messages for invalid inputs
- Security vulnerabilities from malformed inputs
- Difficulty debugging issues with invalid data

**Areas lacking validation:**
- Function parameters (arrays, strings, objects)
- YAML structure validation
- Package name format validation
- Version specification validation

#### Steps to Fix

##### 1. Create Input Validation Utilities
Create a comprehensive validation module:

**File:** `src/handlers/server/plugins/_lib/validation-utils.mjs`
```javascript
import { PluginError } from './error-utils.mjs'

/**
 * Comprehensive input validation utilities for the plugin system
 */

export const validate = {
  /**
   * Validates that a value is a non-empty array
   */
  array: (value, fieldName, options = {}) => {
    const { allowEmpty = false, maxLength = 1000 } = options

    if (!Array.isArray(value)) {
      throw PluginError.validation(fieldName, typeof value, 'array')
    }

    if (!allowEmpty && value.length === 0) {
      throw PluginError.validation(fieldName, 'empty array', 'non-empty array')
    }

    if (value.length > maxLength) {
      throw PluginError.resourceLimit(
        `${fieldName} array length`,
        value.length,
        maxLength
      )
    }

    return value
  },

  /**
   * Validates that a value is a non-empty string
   */
  string: (value, fieldName, options = {}) => {
    const { allowEmpty = false, maxLength = 1000, pattern = null } = options

    if (typeof value !== 'string') {
      throw PluginError.validation(fieldName, typeof value, 'string')
    }

    if (!allowEmpty && value.trim().length === 0) {
      throw PluginError.validation(fieldName, 'empty string', 'non-empty string')
    }

    if (value.length > maxLength) {
      throw PluginError.resourceLimit(
        `${fieldName} string length`,
        value.length,
        maxLength
      )
    }

    if (pattern && !pattern.test(value)) {
      throw PluginError.validation(
        fieldName,
        value,
        `string matching pattern: ${pattern.toString()}`
      )
    }

    return value
  },

  /**
   * Validates boolean values (including undefined/null handling)
   */
  boolean: (value, fieldName, options = {}) => {
    const { allowUndefined = true } = options

    if (allowUndefined && (value === undefined || value === null)) {
      return value
    }

    if (typeof value !== 'boolean') {
      throw PluginError.validation(
        fieldName,
        value === null ? 'null' : typeof value,
        'boolean'
      )
    }

    return value
  },

  /**
   * Validates package names according to npm conventions
   */
  packageName: (value, fieldName = 'package name') => {
    validate.string(value, fieldName, { maxLength: 214 })

    // Handle scoped packages: @scope/name or just name
    const nameOnly = value.includes('@')
      ? (value.startsWith('@') ? value.split('/')[1] : value.split('@')[0])
      : value

    // NPM package name validation
    const validNameRegex = /^[a-z0-9][a-z0-9._-]*$/
    if (!validNameRegex.test(nameOnly)) {
      throw PluginError.validation(
        fieldName,
        value,
        'valid npm package name (lowercase, alphanumeric, ., _, -)'
      )
    }

    // Security checks
    if (value.includes('..') || value.includes('/') || value.includes('\\')) {
      throw PluginError.validation(
        fieldName,
        value,
        'package name without path traversal characters'
      )
    }

    // Reserved names
    const reservedNames = ['node_modules', 'favicon.ico', 'package.json', '.', '..']
    if (reservedNames.includes(nameOnly.toLowerCase())) {
      throw PluginError.validation(fieldName, value, 'non-reserved package name')
    }

    return value
  },

  /**
   * Validates version specifications
   */
  versionSpec: (value, fieldName = 'version specification') => {
    if (value === undefined || value === null) {
      return value
    }

    validate.string(value, fieldName, { maxLength: 50 })

    // Basic semver pattern validation
    const semverPattern = /^(\^|~|>=|<=|>|<|=)?(\d+)(\.\d+)?(\.\d+)?([a-zA-Z0-9.-]*)?$/
    if (!semverPattern.test(value)) {
      throw PluginError.validation(
        fieldName,
        value,
        'valid semver specification (e.g., "1.0.0", "^1.2.3", "~2.1.0")'
      )
    }

    return value
  },

  /**
   * Validates dependency objects from YAML
   */
  dependency: (value, index = null) => {
    const fieldName = index !== null ? `dependency[${index}]` : 'dependency'

    if (typeof value === 'string') {
      // String dependency: just package name or package@version
      const parts = value.split('@')
      if (parts.length === 1) {
        validate.packageName(parts[0], `${fieldName} package name`)
      } else if (parts.length === 2) {
        validate.packageName(parts[0], `${fieldName} package name`)
        validate.versionSpec(parts[1], `${fieldName} version`)
      } else {
        throw PluginError.validation(
          fieldName,
          value,
          'package-name or package-name@version'
        )
      }
      return value
    }

    if (typeof value === 'object' && value !== null) {
      // Object dependency: { npmPackage: string, version?: string }
      if (!value.npmPackage) {
        throw PluginError.validation(
          `${fieldName}.npmPackage`,
          'undefined',
          'string'
        )
      }

      validate.packageName(value.npmPackage, `${fieldName}.npmPackage`)

      if (value.version !== undefined) {
        validate.versionSpec(value.version, `${fieldName}.version`)
      }

      // Check for unexpected properties
      const allowedProps = ['npmPackage', 'version']
      const extraProps = Object.keys(value).filter(prop => !allowedProps.includes(prop))
      if (extraProps.length > 0) {
        throw PluginError.validation(
          fieldName,
          `object with unexpected properties: ${extraProps.join(', ')}`,
          'object with only npmPackage and version properties'
        )
      }

      return value
    }

    throw PluginError.validation(
      fieldName,
      typeof value,
      'string or object with npmPackage property'
    )
  },

  /**
   * Validates YAML structure for plugable-express.yaml files
   */
  yamlConfig: (config, packageName = 'unknown') => {
    if (config === null || config === undefined) {
      return { dependencies: [] }
    }

    if (typeof config !== 'object') {
      throw PluginError.validation(
        `plugable-express.yaml for ${packageName}`,
        typeof config,
        'object'
      )
    }

    // Validate dependencies array if present
    if (config.dependencies !== undefined) {
      validate.array(config.dependencies, 'dependencies', {
        allowEmpty: true,
        maxLength: 100
      })

      // Validate each dependency
      config.dependencies.forEach((dep, index) => {
        validate.dependency(dep, index)
      })
    }

    // Check for unexpected top-level properties
    const allowedProps = ['dependencies', 'meta', 'description']
    const extraProps = Object.keys(config).filter(prop => !allowedProps.includes(prop))
    if (extraProps.length > 0) {
      console.warn(`plugable-express.yaml for ${packageName} contains unexpected properties: ${extraProps.join(', ')}`)
    }

    return config
  }
}
```

##### 2. Update determineInstallationOrder Function
Add comprehensive input validation:

```javascript
const determineInstallationOrder = async({
  installedPlugins,
  noImplicitInstallation,
  packageDir,
  toInstall
}) => {
  // Validate all input parameters
  validate.array(toInstall, 'toInstall', { allowEmpty: false, maxLength: 100 })
  validate.array(installedPlugins, 'installedPlugins', { allowEmpty: true, maxLength: 1000 })
  validate.string(packageDir, 'packageDir', { allowEmpty: false, maxLength: 500 })
  validate.boolean(noImplicitInstallation, 'noImplicitInstallation')

  // Validate each package name in toInstall
  toInstall.forEach((packageName, index) => {
    try {
      validate.packageName(packageName, `toInstall[${index}]`)
    } catch (error) {
      // Enhance error with context
      error.index = index
      error.packageName = packageName
      throw error
    }
  })

  // Validate installed plugins structure
  installedPlugins.forEach((plugin, index) => {
    if (typeof plugin !== 'object' || plugin === null) {
      throw PluginError.validation(
        `installedPlugins[${index}]`,
        typeof plugin,
        'object with npmName property'
      )
    }

    if (!plugin.npmName) {
      throw PluginError.validation(
        `installedPlugins[${index}].npmName`,
        'undefined',
        'string'
      )
    }

    validate.packageName(plugin.npmName, `installedPlugins[${index}].npmName`)
  })

  // Continue with existing logic...
}
```

##### 3. Update readPackageDependencies Function
Add YAML structure validation:

```javascript
const readPackageDependencies = async(packageName) => {
  // Validate input
  validate.packageName(packageName, 'packageName')

  const yamlPath = path.resolve(packageDir, packageName, 'plugable-express.yaml')

  let yamlContent
  try {
    yamlContent = await fs.readFile(yamlPath, 'utf8')
  }
  catch (error) {
    // Handle file system errors (existing logic)
  }

  // Validate YAML content before parsing
  validate.string(yamlContent, 'YAML content', { allowEmpty: true, maxLength: 10000 })

  // Parse YAML content
  try {
    const config = yaml.parse(yamlContent, {
      schema: 'core',
      maxAliasCount: 100,
      prettyErrors: false
    })

    // Validate parsed YAML structure
    const validatedConfig = validate.yamlConfig(config, packageName)

    // Extract and validate dependencies
    const rawDependencies = validatedConfig.dependencies || []

    // Validate and normalize each dependency
    return rawDependencies.map((dep, index) => {
      const validatedDep = validate.dependency(dep, index)

      if (typeof validatedDep === 'string') {
        return validatedDep
      } else {
        // Object format: convert to string format
        return validatedDep.version
          ? `${validatedDep.npmPackage}@${validatedDep.version}`
          : validatedDep.npmPackage
      }
    })
  }
  catch (error) {
    if (error.status) {
      // Re-throw our validation errors
      throw error
    }
    // YAML parsing errors
    throw PluginError.parsing(yamlPath, error, true)
  }
}
```

##### 4. Update installPlugins Function
Add parameter validation:

```javascript
const installPlugins = async({
  app,
  installedPlugins,
  noImplicitInstallation,
  npmNames,
  pluginPkgDir,
  reloadFunc,
  reporter
}) => {
  // Validate required parameters
  if (!app || typeof app !== 'object') {
    throw PluginError.validation('app', typeof app, 'object')
  }

  validate.array(installedPlugins, 'installedPlugins', { allowEmpty: true })
  validate.array(npmNames, 'npmNames', { allowEmpty: false, maxLength: 50 })
  validate.string(pluginPkgDir, 'pluginPkgDir', { allowEmpty: false })
  validate.boolean(noImplicitInstallation, 'noImplicitInstallation')

  // Validate app structure
  if (!app.ext || typeof app.ext !== 'object') {
    throw PluginError.validation('app.ext', typeof app.ext, 'object')
  }

  if (!Array.isArray(app.ext.devPaths)) {
    throw PluginError.validation('app.ext.devPaths', typeof app.ext.devPaths, 'array')
  }

  // Validate reloadFunc if provided
  if (reloadFunc !== undefined && typeof reloadFunc !== 'function') {
    throw PluginError.validation('reloadFunc', typeof reloadFunc, 'function or undefined')
  }

  // Validate reporter if provided
  if (reporter !== undefined) {
    if (typeof reporter !== 'object' || typeof reporter.log !== 'function') {
      throw PluginError.validation('reporter', typeof reporter, 'object with log method')
    }
  }

  // Continue with existing logic...
}
```

##### 5. Add Comprehensive Validation Tests
Create thorough test coverage for all validation scenarios:

```javascript
describe('input validation', () => {
  describe('determineInstallationOrder parameter validation', () => {
    test('validates toInstall array', async() => {
      const invalidInputs = [
        null,
        undefined,
        'string',
        123,
        {},
        []  // empty array
      ]

      for (const invalid of invalidInputs) {
        await expect(determineInstallationOrder({
          installedPlugins: [],
          packageDir: '/test',
          toInstall: invalid
        })).rejects.toThrow(/toInstall.*array/)
      }
    })

    test('validates installedPlugins array structure', async() => {
      const invalidPlugins = [
        [null],
        [undefined],
        ['string'],
        [123],
        [{}], // missing npmName
        [{ npmName: null }],
        [{ npmName: '' }],
        [{ npmName: 'invalid..name' }]
      ]

      for (const invalid of invalidPlugins) {
        await expect(determineInstallationOrder({
          installedPlugins: invalid,
          packageDir: '/test',
          toInstall: ['valid-package']
        })).rejects.toThrow(/installedPlugins/)
      }
    })

    test('validates package names in toInstall', async() => {
      const invalidNames = [
        '../../../etc/passwd',
        'package with spaces',
        'UPPERCASE',
        'package/with/slashes',
        '',
        'node_modules'
      ]

      for (const invalid of invalidNames) {
        await expect(determineInstallationOrder({
          installedPlugins: [],
          packageDir: '/test',
          toInstall: [invalid]
        })).rejects.toThrow(/package name|validation/)
      }
    })
  })

  describe('YAML dependency validation', () => {
    test('validates dependency formats', async() => {
      const invalidDependencies = [
        'dependencies:\n  - 123',
        'dependencies:\n  - null',
        'dependencies:\n  - {}',  // missing npmPackage
        'dependencies:\n  - npmPackage: ""',  // empty package name
        'dependencies:\n  - npmPackage: "valid"\n    version: "invalid-version"',
        'dependencies:\n  - npmPackage: "valid"\n    unexpectedProp: "value"'
      ]

      fs.readFile.mockImplementation((path) => {
        const index = invalidDependencies.findIndex(dep => path.includes(`invalid-${invalidDependencies.indexOf(dep)}`))
        return Promise.resolve(invalidDependencies[index] || 'dependencies: []')
      })

      for (let i = 0; i < invalidDependencies.length; i++) {
        await expect(determineInstallationOrder({
          installedPlugins: [],
          packageDir: '/test',
          toInstall: [`invalid-${i}`]
        })).rejects.toThrow(/dependency|validation/)
      }
    })

    test('accepts valid dependency formats', async() => {
      const validDependencies = [
        'dependencies:\n  - "simple-package"',
        'dependencies:\n  - "@scope/package"',
        'dependencies:\n  - "package@1.0.0"',
        'dependencies:\n  - npmPackage: "object-format"',
        'dependencies:\n  - npmPackage: "@scope/package"\n    version: "^1.2.3"',
        'dependencies: []',
        'dependencies:'  // empty
      ]

      mockGraph.size.mockReturnValue(0)

      for (let i = 0; i < validDependencies.length; i++) {
        fs.readFile.mockResolvedValueOnce(validDependencies[i])

        await expect(determineInstallationOrder({
          installedPlugins: [],
          packageDir: '/test',
          toInstall: [`valid-${i}`]
        })).resolves.toBeDefined()
      }
    })
  })
})
```

#### Validation Steps
1. Test all validation functions with valid and invalid inputs
2. Verify error messages are clear and helpful
3. Ensure validation doesn't impact performance significantly
4. Test edge cases (empty arrays, null values, etc.)
5. Verify backward compatibility with existing valid inputs

#### Files to Modify
- `src/handlers/server/plugins/_lib/validation-utils.mjs` (new file)
- `src/handlers/server/plugins/_lib/installation-order.mjs`
- `src/handlers/server/plugins/_lib/install-plugins.mjs`
- `src/handlers/server/plugins/_lib/test/validation-utils.test.js` (new file)
- `src/handlers/server/plugins/_lib/test/installation-order.test.js`
- `src/handlers/server/plugins/_lib/test/install-plugins.test.js`

#### Success Criteria
- [ ] Comprehensive validation for all function parameters
- [ ] Clear, specific error messages for validation failures
- [ ] Package name validation prevents security issues
- [ ] YAML structure validation prevents parsing errors
- [ ] Version specification validation ensures valid semver
- [ ] Performance impact is minimal (< 5% overhead)
- [ ] Backward compatibility maintained for valid inputs
- [ ] 100% test coverage for validation scenarios