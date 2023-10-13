import { printPath } from './print-path'

// TODO: support nesting with adding indent levels
const parameterCharacteristics = (p) => {
  let output = p.required ? 'REQUIRED' : 'OPTIONAL'
  output += ', ' + (p.isMultivalue ? 'multi-value' : 'single value')
  const type = p.isBoolean
    ? 'boolean'
    : p.isInteger
      ? 'integer'
      : p.isNumber
        ? 'number'
        : 'string'
  output += ', ' + type + '\n'
  if (p.matcher) output += 'matcher: ' + p.matcher.toString()

  return output
}

const indent = 2
const textFormatter = ({ name, path, summary, parameters, description, references }, title) => {
  let output = `${title || name}\n${printPath(path)}\n\n`

  if (summary) {
    output += summary
  }

  if (parameters) {
    output += '\n\nParameters'
    parameters.reduce((output, p) => {
      output += '\n- ' + p.name + '\n'
      output += parameterCharacteristics(p) + '\n\n'
      output += p.description

      return output
    }, output)
  }

  if (description) {
    output += '\n\nDescription\n'
    output += description
  }

  if (references) {
    output += '\n\nReferences\n'
    references.reduce((output, r) => {
      output += `- ${r.name}${r.description ? ': ' : ''}${r.description}${r.description ? ' ' : ''}${r.url}`
      return output
    }, output)
  }

  return output
}

export { textFormatter }
