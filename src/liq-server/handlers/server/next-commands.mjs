import omit from 'lodash.omit'

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
      res.status(400).json({ message: `Unknown terminal command of: '${cmdsWalked.join("', '")}'.`})
      return
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
      const currOptions = optionString.match(/[a-zA-Z0-9]+(?:=(?:'[^']*'|"[^"]*"|\S+|\s+))?/g) || []
      const currOptNames = currOptions.map((o) => o.split('=')[0])
      const options = (frontier['_parameters'] || []).map((o) => o.name)
      const remainder = options.filter((o) => !currOptNames.includes(o.split('=')[0]))
      remainder.sort()
      
      nextCommands.splice(0, nextCommands.length, ...remainder)
    }
  }

  res.json(nextCommands)
}

export { func, method, parameters, path }
