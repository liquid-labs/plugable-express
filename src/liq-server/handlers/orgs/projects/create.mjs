import { getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

const method = 'post'
const path = [ 'orgs', ':orgKey', 'projects', 'create?' ]
const parameters = [
  {
    name: 'name',
    description: 'The project name (sans org qualifier).'
  }
]

const func = ({ model, reporter }) => (req, res) => {
	const org = getOrgFromKey({ model, params: req.vars, res })
  if (org === false) {
    return
  }

  const { name, orgKey } = req.vars
  const orgGithubName = org.getSetting('ORG_GITHUB_NAME')
  if (!orgGithubName) {
  	throw new Error(`'ORG_GITHUB_NAME' not defined for org '${orgKey}'.`)
  }

  const qualifiedName = orgGithubName + '/' + name

  res.status(501).type('text/plain').send(qualifiedName).end()
}

export {
	func,
	method,
	parameters,
	path
}