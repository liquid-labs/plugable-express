import * as fs from 'fs'
import * as path from 'path'

import { playgroundSimplePath } from '@liquid-labs/liq-test-lib'

import { Reporter } from '../../lib/reporter'

const COMMAND_COUNT = 29
const HELP_COUNT = 8

const defaultTestOptions = ({
  skipCorePlugins = true,
  LIQ_PLAYGROUND_PATH = playgroundSimplePath,
  reporter = new Reporter({ silent : true }),
  ...rest
} = {}) =>
  ({
    skipCorePlugins,
    LIQ_PLAYGROUND_PATH,
    reporter,
    ...rest
  })

const bits = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'package.json'))
const packageJSON = JSON.parse(bits)
const CURR_VER = packageJSON.version

export { COMMAND_COUNT, CURR_VER, defaultTestOptions, HELP_COUNT }
