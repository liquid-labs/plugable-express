import kebabCase from 'lodash.kebabcase'

const method = 'get'
const path = '/orgs/:orgKey/staff/roles' // TODO: shouldn't this actually end end a '/'?
const parameters = []

const func = ({ model }) => (req, res) => {
  const { orgKey } = req.params
  const org = model.orgs[orgKey]
  
  const roles = org.roles.list()
  
  const format = req.accepts(['json','pdf','markdown']) || 'json'
  
  switch (format) {
    case 'json':
      res.json(roles); break
    case 'pdf':
    case 'markdown':
      const markdown = ["# Roles\n"]
      for (const { name, summary, superRole, implies = [] } of roles) {
        markdown.push(
          `## ${name}\n`,
          "### Summary\n",
          summary+"\n"
        )
        if (superRole || implies.length > 0) {
          markdown.push("### Implies\n")
          if (superRole && implies.findIndex((i) => i.name === superRole.name) === -1) {
            implies.unshift({ name: superRole.name, mngrProtocol: 'self' })
          }
          for (const { name: impliedName } of implies) {
            markdown.push(`- [${impliedName}](${kebabCase(impliedName)})`)
          }
          markdown.push("\n")
        }
      }
      res.type('text/markdown').send(markdown.join("\n"))
      break
  }
  
}

export { func, method, parameters, path }
