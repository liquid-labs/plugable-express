import * as fs from 'fs'
import * as path from 'path'

import { reporter } from '../../lib/reporter'

reporter.configure({ SILENT : true })

const simplePlaygroundPath = path.join(__dirname, '..', 'data', 'playground-simple')

const defaultTestOptions = {
  skipPlugins: true,
  reporter,
  LIQ_PLAYGROUND_PATH: simplePlaygroundPath
}

const bits = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'))
const packageJSON = JSON.parse(bits)
const CURR_VER=packageJSON.version

export { CURR_VER, defaultTestOptions, reporter }
