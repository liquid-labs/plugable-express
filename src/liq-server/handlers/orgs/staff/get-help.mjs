import { commonOutputParams } from '@liquid-labs/liq-handlers-lib'

import { sendHelp } from '../../help/lib/send-help'

const method = 'get'
const path = [ 'help', 'orgKey', 'staff', 'staffKey' ]
const parameters = [
  {
    name: 'summaryOnly',
    isBoolean: true,
    required: false,
    description: 'Displays the endpoint name, path, and summary only. Use this option for prose output and the `fields` parameter to achive a similar effect for data output.'
  },
  ...commonOutputParams
]
Object.freeze(parameters)


const help = {
  name: "get staff detail",
  summary: "Retrieves details of the specified staff member.",
  description: "<danger>Partial implementation.<rst> By default, this method retrieves the full detail record by default, including all implied roles. Retrieval may be limited by specifying `fields` or `ownRolesOnly`."
}

const func = sendHelp({ help, method, path, parameters })

export { func, parameters, path, method }
