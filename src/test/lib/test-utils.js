import * as fs from 'node:fs'
import * as os from 'node:os'
import * as fsPath from 'node:path'

import { Reporter } from '../../lib/reporter'

const COMMAND_COUNT = 13
const HELP_COUNT = 15

const defaultTestOptions = ({
  serverHome = fsPath.join(os.tmpdir(), 'plugable-express-' + Math.round(Math.random() * 10000000000000000)),
  skipCorePlugins = true,
  reporter = new Reporter({ silent : true }),
  useDefaultSettings = true,
  ...rest
} = {}) => {
  return {
    serverHome,
    skipCorePlugins,
    reporter,
    useDefaultSettings,
    ...rest
  }
}

const bits = fs.readFileSync(fsPath.join(__dirname, '..', '..', '..', 'package.json'))
const packageJSON = JSON.parse(bits)
const CURR_VER = packageJSON.version

export { COMMAND_COUNT, CURR_VER, defaultTestOptions, HELP_COUNT }
