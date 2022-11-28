import omit from 'lodash.omit'

import { optionsTokenizer } from './lib/options-tokenizer'

const method = 'get'
const path = [ 'server', 'next-commands' ]
const parameters = [
  {
    name: 'command',
    description: "The (URL) path so far and optional '--' plus options."
  }
]

const CLI_STYLE = ' '
const URL_STYLE = '/'

const func = ({ app, model }) => (req, res) => {
  const { command = '/'} = req.vars
  
  const [ commandPath, optionString ] = command.split(/\s*--\s*/)
  
  let frontier = app.commandPaths
  const cmdsWalked = []
  const prevElements = {}
  let cmdSep
  let cmdsLeft
  if (commandPath.indexOf('/') === -1) { // then it's the CLI form
    cmdSep = CLI_STYLE
    cmdsLeft = commandPath.split(/\s+/)
    if (cmdsLeft.length !== 0 && cmdsLeft[0].startsWith('liq')) {
      cmdsLeft.shift() // drop any leading 'liq' that we might see in this form
    }
  }
  else { // command is in URL form
    cmdSep = URL_STYLE
    cmdsLeft = commandPath.split('/')
    cmdsLeft.shift() // drop '' from leading '/'
  }
    
  while (cmdsLeft.length > 0) {
    const command = cmdsLeft.shift()
    if (command === '') break; // TODO: ???
    
    cmdsWalked.push(command)
    if (command in frontier) {
      frontier = frontier[command]
    }
    else { // the frontier says ':orgKey' and we have 'orgA' or whatever
      let foundVariablePathElement = null
      for (const fKey of Object.keys(frontier)) {
        if (fKey.startsWith(':')) {
          if (foundVariablePathElement !== null) {
            throw new Error(`Illegal multiple variable path branch possibilities: ${cmdsWalked.join(cmdSep)}${cmdSep}(${foundVariablePathElement}|${fKey})`)
          }
          foundVariablePathElement = fKey
          const typeKey = fKey.slice(1)
          prevElements[typeKey] = command // save the value of the variable
          const elementConfig = app.commonPathResolvers[typeKey]
          const { bitReString } = elementConfig
          if (command.match(new RegExp(bitReString))) {
            frontier = frontier[fKey]
          }
        }
      }
      
      if (foundVariablePathElement === null) {
        res.status(400).json({ message: `Unknown/unmatched final path component of: '${cmdsWalked.join("', '")}'.`})
        return
      }
    }
  }
  
  const nextCommands = Object.keys(frontier)
    .reduce((acc, k) => {
      if (k.startsWith(':')) {
        const elementConfig = app.commonPathResolvers[k.slice(1)] // this should already be validated
        const { optionsFetcher } = elementConfig
        acc.push(...optionsFetcher({ model, ...prevElements }))
      }
      else if (k !== '') { // this happens because the root command is '', but it doesn't make sense to reflect it back
        acc.push(k)
      }
      
      return acc
    }, [])
    // TODO: v is that necessary? Doesn't '_parameters' occur on it's own?
    .sort() // nice, and also puts '_parameters' first (remmember, we require unique paths, so there is only ever one)
  
  if (nextCommands[0] === '_parameters') {
    if (optionString === undefined) {
      nextCommands.splice(0, 1, '--')
    }
    else if (optionString || optionString === '') {
      const currOptions = optionsTokenizer(optionString)
      const currOptNames = currOptions.map((o) => o[0])
      const options = (frontier['_parameters'] || []).map((o) => o.name)
      const remainder = options.filter((o) => !currOptNames.includes(o.split('=')[0]))
      remainder.sort()
      
      nextCommands.splice(0, nextCommands.length, ...remainder)
    }
    nextCommands.sort()
  }

  const format = req.accepts(['json', 'text'])
  
  switch (format) {
    case 'text':
      res.send(nextCommands.join('\n')); break
    default: // json
      res.json(nextCommands)
  }
}

export { func, method, parameters, path }
