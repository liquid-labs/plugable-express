import { commonOutputParams, formatOutput } from '@liquid-labs/liq-handlers-lib'

const method = 'get'
// const path = new RegExp('/orgs(?:/list)?[/#?]?$')
const path = ['server', 'errors', 'list?']
const parameters = commonOutputParams() // option func setup on 'fields' below

const defaultFields = ['id', 'message', 'protected', 'timestamp']
const allFields = ['id', 'message', 'protected', 'stack', 'timestamp']
parameters.find((o) => o.name === 'fields').optionsFunc = () => allFields

const mdFormatter = (orgs, title) =>
  `# ${title}\n\n${orgs.map((e) => `- ${e.id}: ${e.message} @${e.timestamp}`).join('\n')}\n`

const terminalFormatter = (orgs) =>
  orgs.map((e) => `- <code>${e.id}<rst>: <em>${e.message}<rst> @${e.timestamp}`).join('\n') + '\n'

const textFormatter = (orgs) => terminalFormatter.replace(/<[a-z]+>/gm, '')

const func = ({ app, model, reporter }) => (req, res) => {
  const errors = app.liq.errorsRetained.map((e) => Object.assign({ protected : true }, e))
    .concat(app.liq.errorsEphemeral.map((e) => Object.assign({ protected : false }, e)))

  formatOutput({
    basicTitle : 'Error Report',
    data       : errors,
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
