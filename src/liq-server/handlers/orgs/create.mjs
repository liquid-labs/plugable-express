import * as fs from 'node:fs/promises'

import { Organization } from '@liquid-labs/orgs-model'

const help = {
  name        : 'Organization create',
  summary     : 'Creates a organization new organization locally.',
  description : `Creates a new, empty organization. An organization may or may tied to a legal entity, a club, department, etc. Organizations have an organization structure based on roles, staff associated to roles, projects, contracts, relationships with third-party vendors, etc.

    The root data element (<code>org.json<rst>) is saved to <code>localDataRoot<rst> with sub-components saved in federated-json. It is expected (though not currently verified) that <code>localDataRoot<rst> is located in a git repository.`
}

const method = 'post'
const path = ['orgs', 'create', ':newOrgKey']
const parameters = [
  {
    name        : 'commonName',
    required    : true,
    description : 'The common name by which the organization is referred to in casual speech.'
  },
  {
    name        : 'legalName',
    description : 'The organizations legal name, if any.'
  },
  {
    name        : 'localDataRoot',
    required    : true,
    description : 'The local directory in which to save `./orgs/org.json` for the newly created organization.'
  }
]

const mdFormatter = (orgs, title) =>
  `# ${title}\n\n${orgs.map((o) => `* ${o.name}`).join('\n')}\n`

const func = ({ app }) => {
  app.addCommonPathResolver('newOrgKey', {
    bitReString    : '[a-zA-Z0-9][a-zA-Z0-9-]*',
    optionsFetcher : ({ currToken, newOrgKey }) => newOrgKey ? [newOrgKey] : []
  })

  return async(req, res) => {
    const { commonName, legalName, localDataRoot, newOrgKey } = req.vars
    const localRootDir = localDataRoot + '/orgs'

    await fs.mkdir(localRootDir, { recursive : true })

    const rootFile = localRootDir + '/org.json'

    const newOrg = Organization.initializeOrganization({
      commonName,
      dataPath : localDataRoot,
      legalName,
      orgKey   : newOrgKey
    })
  }
}

export { func, help, parameters, path, method }
