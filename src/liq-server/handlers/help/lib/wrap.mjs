const tagBreakers = [ '<', ' ', '\n' ]
/**
* Determines the effective considering any indent and invisible tags.
*/
const getEffectiveWidth = ({ text, width, indent, ignoreTags }) => {
  if (ignoreTags === false) return width - indent
  else {
    width = width - indent // adjust width
    let charCount = 0
    let tagChars = 0
    let sawLtAt=-1
    let cursor = 0
    //         v have we run out of text?         v once we've counted width chars, we're done
    for (; cursor < text.length && charCount < width; cursor += 1) {
      const char = text.charAt(cursor)
      if (sawLtAt > -1) { // maybe in a tag
        if (char === '>') {
          tagChars += cursor - sawLtAt + 1
          sawLtAt = -1
        }
        else if (tagBreakers.includes(char)) { // false alarm, not really a tag
          // charCount += cursor - sawLtAt + 1
          charCount += 1 // count the '<'
          cursor = sawLtAt + 1 // reset the cursor
          sawLtAt = -1
        }
      }
      else { // not in a tag
        if (char === '<') {
          sawLtAt = cursor
        }
        else {
          charCount += 1
        }
      }
    }
    if (sawLtAt > -1) { // then we've run off the end without finding a closing tag
      charCount += cursor - sawLtAt + 1
      if ((charCount - tagChars) > width) { // then we had a '<' and then chars to the end of the line
        return width + tagChars
      }
    }
    
    return charCount + tagChars
  }
}

const wrap = (text, { hangingIndent=false, ignoreTags=false, indent=0, smartIndent=false, width=80,  }={}) => {
  if (!text) return ''
  // text = text.replace(/\s+$/, '') // we'll trim the front inside the while loop
  
  const lines = []
  
  let newPp = true
  let inList = 0
  for (let iLine of text.split('\n')) {
    if (iLine.length === 0) {
      lines.push('')
      newPp = true
      inList = 0
      continue
    }
    else if (iLine.startsWith('-')) {
      // count the depth of indentation (sub-lists)
      inList = iLine.replace(/^(-+).*/, '$1').length
      // and change sublist marker '--' (etc) to single list marker since indentation will be added later
      iLine = iLine.replace(/^-+/, '-')
      newPp = true
    }
    
    while (iLine.length > 0) { // usually we 'break' the flow, but this could happen if we trim the text exactly.
      // determine how many spaces to add before the current line
      const effectiveIndent = !hangingIndent && !smartIndent
        ? indent
        : hangingIndent && !newPp
          ? indent
          : smartIndent && inList > 0 && !newPp
            ? inList * indent
            : smartIndent && inList > 1 && newPp
              ? (inList - 1) * indent
              : 0
      const spcs = ' '.repeat(effectiveIndent)
      const ew = getEffectiveWidth({ text: iLine, width, indent: effectiveIndent, ignoreTags })
      iLine = iLine.replace(/^\s+/, '')
      
      if (ew >= iLine.length) {
        lines.push(spcs + iLine)
        newPp = false
        // lines.push('a23456790' + '123456790'.repeat(7))
        break
      }
      else if (iLine.charAt(ew) === ' ') {
        lines.push(spcs + iLine.slice(0, ew))
        iLine = iLine.slice(ew)
        newPp = false
        // lines.push('b23456790' + '123456790'.repeat(7))
        continue
      }
      else if (iLine.charAt(ew-1) === '-') {
        lines.push(spcs + iLine.slice(0, ew))
        iLine = iLine.slice(ew)
        newPp = false
        // lines.push('c23456790' + '123456790'.repeat(7))
        continue
      }
      
      const iSpace = iLine.lastIndexOf(' ', ew)
      const iDash = iLine.lastIndexOf('-', ew) + 1
      let i = iSpace > iDash ? iSpace : iDash
      if (i === -1) { // then there is no ' ' or '-' to break on and we force a hard break.
        i = ew - 1
      }
      if (i > iLine.length) {
        i = iLine.length
      }
      
      lines.push(spcs + iLine.slice(0, i))
      // lines.push('d23456790' + '123456790'.repeat(7))
      iLine = iLine.slice(i)

      newPp = false
    } // while input line
  } // for each input line
  
  return lines.join('\n')
}

export { getEffectiveWidth, wrap }
