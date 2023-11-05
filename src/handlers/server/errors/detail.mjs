import yaml from 'js-yaml'

const help = {
  name        : 'Detail errors',
  summary     : 'Provides detailed information on the refenced error.',
  description : 'Error reports are stored (temporarily) by the server and this endpoint retrieves details regarding a particular error.'
}

const method = 'get'
// const path = new RegExp('/orgs(?:/list)?[/#?]?$')
const path = ['server', 'errors', ':errorKey', 'detail']
const parameters = []

const highlightYAML = (yaml) => {
  let highlighted = ''
  let inBlock = false
  let indentLevel = 0
  const lines = yaml.split('\n')

  for (let line of lines) {
    const currIndent = line.match(/^ */)[0].length
    if (inBlock && currIndent < indentLevel) {
      inBlock = false
    }
    if (!inBlock) {
      line = line.replace(/^(\s*)([^:]+):/, '$1<h2>$2<rst>:')
      line = line.replace(/(:\s*)(\d+\.?\d*|true|false|null|undefined)/i, '$1<code>$2<rst>')
    }
    if (line.match(/\|-$/)) {
      line = line.replace(/(\|-)$/, '<em>$1<rst>')
      inBlock = true
    }

    highlighted += line + '\n'

    indentLevel = currIndent
  }

  return highlighted
}

const httpOut = ({ data, req, res }) => {
  const format = req.accepts([
    'application/json',
    'text/terminal',
    'text/plain'
  ])

  const json = JSON.stringify(data, null, '  ')
  if (format === 'application/json') {
    res.type('application/json').send(json)
  }
  else {
    let yamlString = yaml.dump(data)
    if (format === 'text/terminal') {
      res.type('text/terminal')
      yamlString = highlightYAML(yamlString)
    }
    else {
      res.type('text/plain')
    }

    res.send(yamlString)
  }
}

const func = ({ app, model, reporter }) => {
  app.ext.pathResolvers.errorKey = {
    optionsFetcher : () => app.ext.errorsRetained.map((e) => e.id)
      .concat(app.ext.errorsEphemeral.map((e) => e.id)),
    bitReString : '[a-z0-9]{5}'
  }

  return (req, res) => {
    const { errorKey } = req.vars

    const error = app.ext.errorsRetained.find((e) => e.id === errorKey)
    || app.ext.errorsEphemeral.find((e) => e.id === errorKey)

    httpOut({ data : error, req, res })
  }
}

export { func, help, parameters, path, method }
