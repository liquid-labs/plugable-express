import * as path from 'path'

import { reporter } from '../lib/reporter'

reporter.configure({ SILENT : true })

const simplePlaygroundPath = path.join(__dirname, 'data', 'playground-simple')

export { reporter, simplePlaygroundPath }
