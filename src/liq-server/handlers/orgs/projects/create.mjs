import * as fs from 'node:fs/promises'

import shell from 'shelljs'

import { readFJSON, writeFJSON } from '@liquid-labs/federated-json'
import { getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

import { checkGitHubSSHAccess } from './lib/github-lib'

const DEFAULT_LICENSE='UNLICENSED'
const DEFAULT_VERSION='1.0.0-alpha.0'

const method = 'post'
const path = [ 'orgs', ':orgKey', 'projects', 'create?' ]
const parameters = [
	{
		name: 'description',
		isSingleValue: true,
		required: true,
		description: 'If provided, will be used to set the newly created package description.'
	},
	{
		name: 'license',
		isSingleValue: true,
		description: `Sets the license string for the newly created package. If not provided, then defaults to org setting 'ORG_DEFAULT_LICENSE' if set and '${DEFAULT_LICENSE}' otherwise.`
	},
  {
    name: 'name',
    isSingleValue: true,
    required: true,
    description: 'The project name (sans org qualifier).'
  },
  {
  	name: 'version',
  	isSingleValue: true,
  	description: `The version string to use for the newly initialized package \`version\` field. Defaults to '${DEFAULT_VERSION}'.`
  }
]

const func = ({ app, model, reporter }) => async (req, res) => {
	const org = getOrgFromKey({ model, params: req.vars, res })
  if (org === false) {
    return
  }

  const { description, license, name, orgKey, version=DEFAULT_VERSION } = req.vars
  const orgGithubName = org.getSetting('ORG_GITHUB_NAME')
  if (!orgGithubName) {
  	res.status(400).type('text/plain').send(`'ORG_GITHUB_NAME' not defined for org '${orgKey}'.`)
  }

  if (!checkGitHubSSHAccess({ res })) return // it will handle user feedback
  // else we are good to proceed

  // set up the staging directory
  const stagingDir = `${app.liqHome()}/tmp/liq-core/project-staging/${name}`
  await fs.mkdir(stagingDir, { recursive: true })

  const initResult = shell.exec(`cd "${stagingDir}" && git init --quiet . && npm init -y > /dev/null`)
  if (initResult.code !== 0) {
  	res.status(500).type('text/terminal')
  		.send(`There was an error initalizing the local project in staging dir '${stagingDir}' (${initResult.code}):\n${initResult.stderr}`)
  	return
  }

  const packagePath = stagingDir + '/package.json'
  const packageJSON = readFJSON(packagePath)

  const qualifiedName = orgGithubName + '/' + name
	const repoFragment = 'github.com/' + qualifiedName
  const repoURL = `git+ssh://git@${repoFragment}.git`
  const bugsURL = `https://${repoFragment}/issues`
  const homepage = `https://${repoFragment}#readme`
  const pkgLicense = license || org.getSetting('ORG_DEFAULT_LICENSE') || DEFAULT_LICENSE

  packageJSON.name = '@' + qualifiedName
  packageJSON.main = `dist/${name}.js`
  packageJSON.version = version
  packageJSON.repository = repoURL
  packageJSON.bugs = { url: bugsURL }
  packageJSON.homepage = homepage
  packageJSON.license = pkgLicense
  if (description) {
  	packageJSON.description = description
  }

  writeFJSON({ data: packageJSON, file: packagePath, noMeta: true })

  res.status(501).type('text/terminal').send(qualifiedName)
}

export {
	func,
	method,
	parameters,
	path
}