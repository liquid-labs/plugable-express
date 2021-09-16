// import asyncHandler from 'express-async-handler'
import express from 'express'

import { handlers } from './handlers'

const app = express()

app.initialize = ({ model }) => {
  for (const handler of handlers) {
    console.log(`registering handler for path: ${handler.verb.toUpperCase()}:${handler.path}`)
    app[handler.verb](handler.path, handler.func(model))
  }
  
  return app
}

export { app }
