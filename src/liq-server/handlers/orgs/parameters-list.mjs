import omit from 'lodash.omit'

import { commonOutputParams, formatOutput, getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

const method = 'get'
const path = [ 'orgs', ':orgKey', 'parameters', 'list?' ]
const parameters = commonOutputParams // option func setup on 'fields' below

const defaultFields = [ 'name', 'value' ]
const allFields = [ ...defaultFields ]
parameters.find((o) => o.name === 'fields').optionsFunc = () => allFields

const mdFormatter = (parameters, title) =>
  `# ${title}\n\n${parameters.map((p) => `- _${p.name}_: ${p.value}`).join("\n")}\n`

const terminalFormatter = (parameters, title) =>
  parameters.map((p) => `- <code>${p.name}<rst>: ${p.value}`).join("\n") + '\n'

const textFormatter = (parameters, title) =>
  parameters.map((p) => `- ${p.name}: ${p.value}`).join("\n") + '\n'

const allCapsRe = /^[A-Z_]+$/

const func = ({ model, reporter }) => (req, res) => {
  const org = getOrgFromKey({ model, params: req.vars, res })
  if (org === false) return
  
  const parameters = []
  const frontier = [{ path: '', struct: org.settings }]

  while (frontier.length > 0) {
    const { path, struct } = frontier.shift()

    for (const key in struct) {
      if (key.match(allCapsRe)) {
        parameters.push({ name: path + '.' + key, value: struct[key] })
      }
      else {
        frontier.push({ path: path + '.' + key, struct: struct[key] })
      }
    }
  }

  formatOutput({
    basicTitle : `Org ${org.name} Parameters`,
    data : parameters,
    allFields,
    defaultFields,
    mdFormatter,
    terminalFormatter,
    textFormatter,
    reporter,
    req,
    res,
    ...req.vars
  })
}

export { func, parameters, path, method }
