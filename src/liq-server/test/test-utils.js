import { reporter } from '../lib/reporter'

reporter.configure({ SILENT: true })

const simplePlaygroundPath = `${__dirname}/data/playground-simple`

export { reporter, simplePlaygroundPath }
