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

const func = ({ app, model }) => (req, res) => {
  const { command = '/'} = req.vars
  
  const [ commandPath, optionString ] = command.split(/\s*--\s*/)
  
  let frontier = app.commandPaths
  const cmdsWalked = []
  const cmdsLeft = commandPath.split('/')
  cmdsLeft.shift() // drop '' from leading '/'
  while (cmdsLeft.length > 0) {
    const command = cmdsLeft.shift()
    if (command === '') break;
    
    cmdsWalked.push(command)
    if (command in frontier) {
      frontier = frontier[command]
    }
    else {
      const constructedFrontier = {}
      
      for (const fKey of Object.keys(frontier)) {
        if (fKey.startsWith(':')) {
          const elementConfig = app.pathElements[fKey.slice(1)] // this should already be validated
          const { bitReString } = elementConfig({ model })
          if (command.match(new RegExp(bitReString))) {
            Object.assign(constructedFrontier, frontier[fKey])
          }
        }
      }
      
      if (Object.keys(constructedFrontier).length === 0) {
        res.status(400).json({ message: `Unknown/unmatched terminal path component of: '${cmdsWalked.join("', '")}'.`})
        return
      }
      frontier = constructedFrontier
    }
  }
  
  const nextCommands = Object.keys(frontier)
    .sort() // nice, and also puts '_parameters' first (remmember, we require unique paths, so there is only ever one)
    .reduce((acc, k) => {
      if (k.startsWith(':')) {
        const elementConfig = app.pathElements[k.slice(1)] // this should already be validated
        const { optionsFetcher } = elementConfig({ model })
        acc.push(...optionsFetcher())
      }
      else {
        acc.push(k)
      }
      
      return acc
    }, [])
  
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
  }

  res.json(nextCommands)
}

export { func, method, parameters, path }
