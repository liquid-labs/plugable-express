const indSpace = ({ hangingIndent, indent, lines }) =>
  lines.length > 0 || !hangingIndent ? ' '.repeat(indent) : ''
  
const format4Terminal = (text) => text.replaceAll(/`([^`]*)`/g, '<dBgGreen><white>$1<rst>')

const wrap = (text, { hangingIndent=false, indent=0, width=80, formatTerminal=false }={}) => {
  if (!text) return ''
  text = text.replace(/\s+$/, '') // we'll trim the front inside the while loop
  if (formatTerminal === true) {
    text = format4Terminal(text)
  }
  const ew = width - indent // effective width
  const lines = []
  while (text.length > 0) { // we'll berak out
    text = text.replace(/^\s+/, '')
    const spcs = indSpace({ hangingIndent, indent, lines })
    if (ew >= text.length) {
      lines.push(spcs + text)
      break
    }
    if (text.charAt(ew) === ' ') {
      lines.push(spcs + text.slice(0, ew))
      text = text.slice(ew)
      continue
    }
    if (text.charAt(ew-1) === '-') {
      lines.push(spcs + text.slice(0, ew))
      text = text.slice(ew)
    }
    
    const iSpace = text.lastIndexOf(' ', ew)
    const iDash = text.lastIndexOf('-', ew) + 1
    let i = iSpace > iDash ? iSpace : iDash
    i = i === -1 ? width - 1 : i
    
    lines.push(spcs + text.slice(0, i))
    text = text.slice(i)
  }
  
  return lines.join('\n')
}

export { wrap }
