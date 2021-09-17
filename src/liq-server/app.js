// import asyncHandler from 'express-async-handler'
import express from 'express'

import { handlers } from './handlers'

const app = express()

app.initialize = ({ model, reporter = console }) => {
  for (const handler of handlers) {
    reporter.log(`registering handler for path: ${handler.verb.toUpperCase()}:${handler.path}`)
    app[handler.verb](handler.path, handler.func(model))
  }
  
  return app
}

export { app }
