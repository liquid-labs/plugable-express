import { printPath } from './print-path'
import { wrap } from './wrap'

// TODO: support nesting with incrementing headers and adding indent levels
const parameterCharacteristics = (p, wrapOps = {}) => {
  let typeInfo = '<fgc:118><bold>' + (p.required ? 'REQUIRED' : 'OPTIONAL') + '<rst><fgc:118>'
  typeInfo += ', ' + (p.isMultivalue ? 'multi-value' : 'single value')
  const type = p.isBoolean ? 'boolean'
    : p.isInteger ? 'integer'
    : p.isNumber ? 'number'
    : 'string'
  typeInfo += ', ' + type + '<rst>'
  const matcher = p.matcher ? '<em>matcher: ' + p.matcher.toString() + '<rst>' : ''
  
  return wrap(typeInfo, wrapOps) + (p.matcher ? '\n' + wrap(matcher, wrapOps) : '')
}

const indent = 2
const terminalFormatterGen = ({
  width=80,
  nesting=0,
  tH1='<canaryYellow><underscore>',
  tH2 = '<richYellow><underscore>',
  tSubtitle='<dim>',
  tEm = '<yellow>'
}={}) => ({ name, path, summary, parameters, description, references }, title) => {
  let output = `<h1>${printPath(path)}<rst>\n\n`
  
  if (summary) {
    output += summary
  }
  
  if (parameters) {
    output += `\n\n<h2>Parameters<rst>\n`
    output += parameters.reduce((output, p) => {
      output += '\n- <em>' + p.name + '<rst>:\n'
      output += parameterCharacteristics(p, { indent, width }) + '\n'
      output += wrap(p.description, { indent, width, formatTerminal:true }) + '\n'
      return output
    }, '')
  }

  if (description) {
    output += `\n<h2>Description<rst>\n\n`
    output += wrap(description, { width, formatTerminal:true }) + '\n'
  }
  
  if (references) {
    output += '\n<h2>References<rst>\n'
    references.reduce((output, r) => {
      output += `- <em>${r.name}<rst>${r.description ? ': ' : ''}${r.description}${r.description ? ' ' : ''}${r.url}`
    })
  }
  
  return output
    .replaceAll(/<h1>/g, tH1)
    .replaceAll(/<h2>/g, tH2)
    .replaceAll(/<subtitle>/g, tSubtitle)
    .replaceAll(/<em>/g, tEm)
}

export { terminalFormatterGen }
