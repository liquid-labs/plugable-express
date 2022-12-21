import { formatOutput } from '@liquid-labs/liq-handlers-lib'

import { mdFormatterGen } from './formatter-md'
import { terminalFormatterGen } from './formatter-terminal'
import { textFormatterGen } from './formatter-text'

const allHelpFields = [ 'description', 'method', 'name', 'parameters', 'path', 'references', 'summary' ]
const defaultHelpFields = allHelpFields

const sendHelp = ({ help, method, path, parameters }) => {
  const sortedParameters = [...parameters]
  sortedParameters.sort((a,b) => a.name.localeCompare(b.name))
  
  const func = ({ model, reporter }) => (req, res) => {
    formatOutput({
      basicTitle : 'Help',
      data : { method, parameters: sortedParameters, path, ...help },
      allFields: allHelpFields,
      defaultFields: defaultHelpFields,
      mdFormatter: mdFormatterGen(),
      terminalFormatter: terminalFormatterGen(),
      textFormatter: textFormatterGen(),
      noDateMark : true,
      reporter,
      req,
      res,
      ...req.vars
    })
  }
  
  return func
}

export { sendHelp }
