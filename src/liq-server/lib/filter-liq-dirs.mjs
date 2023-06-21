import * as fs from 'node:fs'
import * as fsPath from 'node:path'

const filterLiqDirs = ({ files, basePath, reporter = console }) =>
  files.filter((file) => {
    // silently ignore non-dirs and hidden stuff
    if (file.name.startsWith('.') || !file.isDirectory()) return false

    const candidate = fsPath.join(basePath, file.name)
    // ignore marked dirs with note
    if (fs.existsSync(fsPath.join(candidate, '.liq-ignore'))) {
      reporter.log(`Ignoring '${file.name}' due to '.liq-ignore marker.'`)
      return false
    }

    return true
  })

export { filterLiqDirs }
