const method = 'get'
const path = [ 'server', 'next-commands' ]
const parameters = [
  {
    name: 'commandPath',
    description: 'The (URL) path so far.'
  }
]

const func = ({ app }) => (req, res) => {
  const { commandPath = '/' } = req.vars
  
  let frontier = app.commandPaths
  const walked = []
  const left = commandPath.split('/')
  left.shift() // drop '' from leading '/'
  while (left.length > 0) {
    const command = left.shift()
    if (command === '') break;
    
    walked.push(command)
    if (command in frontier) {
      frontier = frontier[command]
    }
    else {
      res.status(400).json({ message: `Unknown terminal command of: '${walked.join("', '")}'.`})
      return
    }
  }
  
  const nextCommands = Object.keys(frontier)
  if (nextCommands.length === 0) {
    res.json(['--'])
  }
  else {
    res.json(nextCommands)
  }
}

export { func, method, parameters, path }
