import { reloadApp } from '../../app'

const method = 'put'
const path = ['server', 'reload']
const parameters = []

const func = ({ app, cache, reporter }) => async(req, res) => {
  reloadApp()

  res.json({ message : 'App reloaded.' })
}

export { func, method, parameters, path }
