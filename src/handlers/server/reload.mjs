const help = {
  name: 'Server reload',
  summary: 'Reloads the server settings and plugins from disk.',
  description: 'Reloads the server settings and plugins from disk. This is necessary when changes are made to the state/data files outside of the server (e.g., through manual file edits). Generally, changes made through server endpoints should be re-loaded themselves.',
}

const method = 'put'
const path = ['server', 'reload']
const parameters = []

const func = ({ app, cache, reporter }) => async(req, res) => {
  app.reload()

  res.json({ message : 'App reloaded.' })
}

export { func, help, method, parameters, path }
