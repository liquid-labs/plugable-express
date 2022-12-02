const indSpace = ({ hangingIndent, indent, lines }) =>
  lines.length > 0 || !hangingIndent ? ' '.repeat(indent) : ''

const tagBreakers = [ '<', ' ', '\n' ]
const getEffectiveWidth = ({ text, width, indent, ignoreTags }) => {
  if (ignoreTags === false) return width - indent
  else {
    let charCount = 0
    let tagChars = 0
    let sawLtAt=-1
    for (let cursor = 0; cursor < text.length; cursor += 1) {
      if (cursor + 1 + indent - tagChars === width) {
        return width - indent + tagChars
      }
      
      const char = text.charAt(cursor)
      if (sawLtAt > -1) {
        if (char === '>') {
          tagChars += cursor - sawLtAt + 1
        }
        else if (tagBreakers.includes(char)) {
          charCount += 1
          cursor = sawLtAt + 1
          sawLtAt = -1
        }
      }
      else { // haven's seen '<', just consuming chars
        if (char === '<') {
          sawLtAt = cursor
        }
        else {
          charCount += 1
        }
      }
    }
    
    return width - indent + tagChars
  }
}

const wrap = (text, { hangingIndent=false, ignoreTags=false, indent=0, smartIndent=false, width=80,  }={}) => {
  if (!text) return ''
  text = text.replace(/\s+$/, '') // we'll trim the front inside the while loop
  
  const lines = []
  
  for (let iLine of text.split('\n')) {
    if (iLine.length === 0) {
      lines.push('')
      continue
    }
    
    while (iLine.length > 0) { // usually we 'break' the flow, but this could happen if we trim the text exactly.
      const ew = getEffectiveWidth({ text: iLine, width, indent, ignoreTags })
      iLine = iLine.replace(/^\s+/, '')
      const spcs = indSpace({ hangingIndent, indent, lines })
      if (ew >= iLine.length) {
        lines.push(spcs + iLine)
        // lines.push('a23456790' + '123456790'.repeat(7))
        break
      }
      else if (iLine.charAt(ew) === ' ') {
        lines.push(spcs + iLine.slice(0, ew))
        iLine = iLine.slice(ew)
        // lines.push('b23456790' + '123456790'.repeat(7))
        continue
      }
      else if (iLine.charAt(ew-1) === '-') {
        lines.push(spcs + iLine.slice(0, ew))
        iLine = iLine.slice(ew)
        // lines.push('c23456790' + '123456790'.repeat(7))
        continue
      }
      
      const iSpace = iLine.lastIndexOf(' ', ew)
      const iDash = iLine.lastIndexOf('-', ew) + 1
      let i = iSpace > iDash ? iSpace : iDash
      i = i === -1 ? width - 1 : i
      
      lines.push(spcs + iLine.slice(0, i))
      // lines.push('d23456790' + '123456790'.repeat(7))
      iLine = iLine.slice(i)
    }
  }
  
  return lines.join('\n')
}

export { getEffectiveWidth, wrap }
