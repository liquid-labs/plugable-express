import { getPackageJSON } from '../_shared/get-packageJSON'

const method = 'get'
// const path = '/playground/projects/:orgName([a-zA-Z][a-zA-Z0-9-]{0,})/blah/:projectName([a-zA-Z][a-zA-Z0-9-]{0,})/packageJSON'
const path = '/playground/projects/:orgName/:projectName/packageJSON'

const func = ({ model }) => (req, res) => getPackageJSON({ req, res, model })

export { func, path, method }
