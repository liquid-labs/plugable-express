// import asyncHandler from 'express-async-handler'
import express from 'express'

import { handlers } from './handlers'
import { model } from './model'

const app = express()

for (const handler of handlers) {
  console.log(`registering handler for path: ${handler.verb.toUpperCase()}:${handler.path}`)
  app[handler.verb](handler.path, handler.func(model))
}

export { app }
