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
const terminalFormatterGen = ({ nesting = 0 } = {}) => {
  const hLvl = (base) => base + nesting

  return ({ data /* we ignore title */ }) => {
    const { path, summary, parameters, description, references } = data

    let output = `\n<h${hLvl(1)}><bold>/${path.join('/')}<rst>\n\n`

    if (summary) {
      output += summary
    }

    if (parameters) {
      output += `\n\n<h${hLvl(2)}>Parameters<rst>`
      output += parameters.reduce((output, p) => {
        output += '\n- <code><underline>' + p.name + '<rst>: ('
        output += parameterCharacteristics(p, { indent }) + ') '
        output += p.description
        return output
      }, '')
      output += '\n'
    }

    if (description) {
      output += `\n<h${hLvl(2)}>Description<rst>\n`
      output += description + '\n'
    }

    if (references) {
      output += `\n<h${hLvl(2)}>References<rst>\n`
      references.reduce((output, r) => {
        output += `- <em>${r.name}<rst>${r.description ? ': ' : ''}${r.description}${r.description ? ' ' : ''}${r.url}`
        return output
      }, output)
    }

    output += '\n'

    return output
  }
}

export { terminalFormatterGen }
