import { getPackageJSON } from '../../_shared/get-packageJSON'

const verb = 'get'
const path = '/playground/orgs/:orgName([a-zA-Z][a-zA-Z0-9-]{0,})/projects/:projectName([a-zA-Z][a-zA-Z0-9-]{0,})/packageJSON'

const func = (model) => (req, res) => getPackageJSON({ req, res, model })

export { func, path, verb }
