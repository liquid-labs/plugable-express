import * as fs from 'fs'
import * as path from 'path'

import { initReporter } from '../../lib/reporter'

const COMMAND_COUNT = 25
const HELP_COUNT = 3

const simplePlaygroundPath = path.join(__dirname, '..', 'data', 'playground-simple')

const defaultTestOptions = ({
  skipCorePlugins = true,
  LIQ_PLAYGROUND_PATH = simplePlaygroundPath,
  reporter = initReporter({ silent : true }),
  ...rest
} = {}) =>
  ({
    skipCorePlugins,
    LIQ_PLAYGROUND_PATH,
    reporter,
    ...rest
  })

const bits = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'))
const packageJSON = JSON.parse(bits)
const CURR_VER = packageJSON.version

export { COMMAND_COUNT, CURR_VER, defaultTestOptions, HELP_COUNT }
