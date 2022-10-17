const paramPairRe = /[a-zA-Z0-9]+(?:=(?:'[^']*'|"[^"]*"|\S+|\s+))?/g
const qtValueRe = /^(['"]).*\1$/

const optionsTokenizer = (optionString) =>
  (optionString.match(paramPairRe) || [])
    .map((p) => {
      let [ name, value=true ] = p.split('=')
      if (value !== true) {
        const match = value.match(qtValueRe)
        if (match) {
          value = value.slice(1, -1)
          const qt = match[1]
          const deEscapeRe = new RegExp('\\' + qt, 'g')
          value.replace(deEscapeRe, qt)
        }
      }
      
      return [ name, value ]
    })

export { optionsTokenizer }
