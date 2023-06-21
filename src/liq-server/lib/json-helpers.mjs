import * as fs from 'node:fs'
import * as fsPath from 'node:path'

const readPackageJSON = (basePath) => {
  const packageJSONPath = fsPath.join(basePath, 'package.json')
  return safeJSONParse(packageJSONPath)
}

const safeJSONParse = (path) => {
  if (!fs.existsSync(path)) return null

  const bits = fs.readFileSync(path)
  try {
    return JSON.parse(bits)
  }
  catch (e) {
    if (e instanceof SyntaxError) {
      throw new SyntaxError(`${e.message} while processing ${path}`)
    }
    else {
      throw e
    }
  }
}

export { readPackageJSON, safeJSONParse }
