import { printPath } from './print-path'
import { wrap } from './wrap'

const parameterCharacteristics = (p) => {
  let output = '*' + (p.required ? 'REQUIRED' : 'OPTIONAL')
  output += ', ' + (p.isMultivalue ? 'multi-value' : 'single value')
  const type = p.isBoolean
    ? 'boolean'
    : p.isInteger
      ? 'integer'
      : p.isNumber
        ? 'number'
        : 'string'
  output += ', ' + type + '*\n'
  if (p.matcher) output += '*matcher: ' + p.matcher.toString() + '*'
}

const indent = 2
const mdFormatterGen = ({ width = 80, nesting = 0 } = {}) => ({ name, path, summary, parameters, description, references }, title) => {
  let output = `#${'#'.repeat(nesting)} ${title || name}\n*${printPath(path)}*\n\n`

  if (summary) {
    output += summary
  }

  if (parameters) {
    output += `\n\n##${'#'.repeat(nesting)} Parameters\n`
    parameters.reduce((output, p) => {
      output += '- *' + p.name + '*: <br />\n'
      output += wrap(parameterCharacteristics(p), { indent, width }) + '\n\n'
      output += wrap(p.description, { indent, width }) + '\n'
      return output
    }, output)
  }

  if (description) {
    output += `\n##${'#'.repeat(nesting)} Description\n`
    output += wrap(description, { width }) + '\n'
  }

  if (references) {
    output += `\n##${'#'.repeat(nesting)} References\n`
    references.reduce((output, r) => {
      if (r.url) {
        output += `- [*${r.name}*](${r.url})` + (r.description ? `: ${r.description}` : '')
      }
      else {
        output += `- *${r.name}*` + (r.description ? `: ${r.description}` : '')
      }
    })
  }

  return output
}

export { mdFormatterGen }
