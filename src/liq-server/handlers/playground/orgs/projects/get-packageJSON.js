import { getPackageJSON } from '../../_shared/get-packageJSON'

const method = 'get'
const path = [ 'playground', 'orgs', ':orgKey', 'projects', ':projectName', 'packageJSON' ]

const func = ({ model }) => (req, res) => getPackageJSON({ req, res, model })

export { func, path, method }
