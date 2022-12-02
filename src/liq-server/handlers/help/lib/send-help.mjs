import { commonOutputConfig, commonOutputParams, formatOutput } from '@liquid-labs/liq-handlers-lib'

import { mdFormatterGen } from './formatter-md'
import { terminalFormatterGen } from './formatter-terminal'
import { textFormatterGen } from './formatter-text'

const helpParameters = [
  {
    name: 'summaryOnly',
    isBoolean: true,
    required: false,
    description: 'Displays the endpoint name, path, and summary only. Use this option for prose output and the `fields` parameter to achive a similar effect for data output.'
  },
  ...commonOutputParams
]
Object.freeze(helpParameters)

const allHelpFields = [ 'description', 'method', 'name', 'parameters', 'path', 'references', 'summary' ]
const defaultHelpFields = allHelpFields

const sendHelp = ({ help, method, path }) => {
  const func = ({ model, reporter }) => (req, res) => {
    formatOutput({
      basicTitle : 'Help',
      data : { method, parameters: helpParameters, path, ...help },
      mdFormatter: mdFormatterGen(),
      terminalFormatter: terminalFormatterGen(),
      textFormatter: textFormatterGen(),
      noDateMark : true,
      reporter,
      req,
      res,
      ...commonOutputConfig({
        allFields: allHelpFields,
        defaultFields: defaultHelpFields,
      }, req.query)
    })
  }
  
  
  return {
    func,
    parameters: helpParameters
  }
}

export { sendHelp }
