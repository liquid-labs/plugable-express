import * as fs from 'node:fs/promises'

import { Organization } from '@liquid-labs/orgs-model'

const method = 'post'
const path = [ 'orgs', 'create', ':newOrgKey' ]
const parameters = [
  {
    name: 'commonName',
    required: true,
    description: 'The comman name by which the organization is referred to in casual speech.'
  },
  {
    name: 'legalName',
    description: 'The organizations legal name, if any.'
  },
  {
    name: 'localDataRoot',
    required: true,
    description: 'The local directory in which to save `./orgs/org.json` for the newly created organization.'
  }
]

const mdFormatter = (orgs, title) =>
  `# ${title}\n\n${orgs.map((o) => `* ${o.name}`).join("\n")}\n`

const func = ({ app }) => {
  app.addCommonPathResolver('newOrgKey', {
    bitReString: '[a-zA-Z0-9][a-zA-Z0-9-]*',
    optionsFetcher: ({ currToken, newOrgKey }) => newOrgKey ? [ newOrgKey ] : []
  })

  return async (req, res) => {
    const { commonName, legalName, localDataRoot, newOrgKey } = req.vars
    const localRootDir = localDataRoot + '/orgs'

    await fs.mkdir(localRootDir, { recursive: true })

    const rootFile = localRootDir + '/org.json'

    const newOrg = Organization.initializeOrganization({ 
      commonName, 
      dataPath: localDataRoot, 
      legalName, 
      orgKey: newOrgKey 
    })
  }
}

export { func, parameters, path, method }
