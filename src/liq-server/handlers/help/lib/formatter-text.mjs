import { printPath } from './print-path'
import { wrap } from './wrap'

// TODO: support nesting with adding indent levels
const parameterCharacteristics = (p) => {
  let output = p.required ? 'REQUIRED' : 'OPTIONAL'
  output += ', ' + (p.isMultivalue ? 'multi-value' : 'single value')
  const type = p.isBoolean ? 'boolean'
    : p.isInteger ? 'integer'
    : p.isNumber ? 'number'
    : 'string'
  output += ', ' + type + '\n'
  if (p.matcher) output += 'matcher: ' + p.matcher.toString()
}

const indent = 2
const textFormatterGen = ({ width=80 }=80) => ({ name, path, summary, parameters, description, references }, title) => {
  let output = `${title || name}\n${printPath(path)}\n\n`
  
  if (summary) {
    output += summary
  }
  
  if (parameters) {
    output += '\n\nParameters'
    parameters.reduce((output, p) => {
      output += '\n- ' + p.name + '\n'
      output += wrap(parameterCharacteristics(p), { indent, width }) + '\n\n'
      output += wrap(p.description, { indent, width })
      return output
    }, output)
  }

  if (description) {
    output += '\n\nDescription\n'
    output += wrap(description, { indent, width })
  }
  
  if (references) {
    output += '\n\nReferences\n'
    references.reduce((output, r) => {
      output += `- ${r.name}${r.description ? ': ' : ''}${r.description}${r.description ? ' ' : ''}${r.url}`
    })
  }
  
  return output
}

export { textFormatterGen }
