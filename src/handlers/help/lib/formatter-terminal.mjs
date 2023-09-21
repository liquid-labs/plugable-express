import { printPath } from './print-path'
import { wrap } from './wrap'

// TODO: support nesting with incrementing headers and adding indent levels
const parameterCharacteristics = (p) => {
  let typeInfo = '<dim>' + (p.required ? '<underline>REQUIRED<rst><dim>' : 'optional')
  typeInfo += ', ' + (p.isMultivalue ? 'multi-value' : 'single value')
  const type = p.isBoolean
    ? 'boolean'
    : p.isInteger
      ? 'integer'
      : p.isNumber
        ? 'number'
        : 'string'
  typeInfo += ', ' + type
  typeInfo += p.matcher ? ': ' + p.matcher.toString() : ''

  return typeInfo + '<rst>'
}

const indent = 2
const terminalFormatterGen = ({
  width = 80,
  nesting = 0
} = {}) => ({ name, path, summary, parameters, description, references }, title) => {
  let output = `\n<h1>${name}<rst>\n\nPath: <em>${printPath(path)}<rst>\n\n`

  if (summary) {
    output += summary
  }

  if (parameters) {
    output += '\n\n<h2>Parameters<rst>'
    output += parameters.reduce((output, p) => {
      output += '\n- <code><underline>' + p.name + '<rst>: ('
      output += parameterCharacteristics(p, { indent, width }) + ')\n'
      output += p.description
      return output
    }, '')
    output += '\n'
  }

  if (description) {
    output += '\n<h2>Description<rst>\n'
    output += wrap(description + '\n', { width, formatTerminal : true })
  }

  if (references) {
    output += '\n<h2>References<rst>\n'
    references.reduce((output, r) => {
      output += `- <em>${r.name}<rst>${r.description ? ': ' : ''}${r.description}${r.description ? ' ' : ''}${r.url}`
      return output
    }, output)
  }

  output += '\n'

  output = wrap(output, { width, indent, ignoreTags : true, smartIndent : true })

  return output
}

export { terminalFormatterGen }
