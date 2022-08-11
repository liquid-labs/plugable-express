const nickName = 'help'

const help = 'Generates help based on endpoint nicknames.'

const method = 'get'

const path = '/help/:nickName'

const parameters = [ 
  {
    name: 'nickName',
    description: 'Identifies the endpoint help wanted.'
  },
  {
    name: 'format',
    isRequired: false,
    description: "The output format for the help. Defaults and currently only supports 'cli'."
  }
]

const func = ({ app }) => (req, res) => {
  const { nickName : helpRef } = req.params
  const { format = 'cli' } = req.query
  
  app.help(helpRef, format, res)
}

export {
  func, help, method, nickName, parameters, path
}
