/* global fetch */

import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import { spawn } from 'node:child_process'

import {
  LIQ_SERVER_STATUS_RUNNING,
  LIQ_SERVER_STATUS_STOPPED,
  LIQ_SERVER_STATUS_UNRECOVERABLE,
  LIQ_SERVER_STATUS_WORKING
} from './constants'
import { LIQ_SERVER_PID_FILE } from '@liquid-labs/liq-defaults'

import { status } from './status'

const start = async() => {
  const currStatus = await status()

  if (currStatus === LIQ_SERVER_STATUS_RUNNING) {
    console.log('Server already running. Nothing to do.')
    process.exit(LIQ_SERVER_STATUS_RUNNING)
  }
  else if (currStatus !== LIQ_SERVER_STATUS_STOPPED) {
    console.log('Server is not running cleanly, nor stopped. Bailing out.')
    process.exit(LIQ_SERVER_STATUS_UNRECOVERABLE)
  }

  console.log('Starting...')

  const nodeScript = fsPath.join(__dirname, 'liq-server.js')
  const pkgRoot = fsPath.dirname(__dirname)

  const outFile = process.argv[3] || 'stdout.log'
  const errFile = process.argv[4] || 'stderr.log'
  const out = await fs.open(outFile, 'a')
  const err = await fs.open(errFile, 'a')

  const child = spawn('node', ['--enable-source-maps', nodeScript, 'liq-server:run'], {
    detached : true,
    stdio    : ['ignore', out, err],
    cwd      : pkgRoot,
    env      : Object.assign({ NODE_PATH : fsPath.join(pkgRoot, 'node_modules') }, process.env)
  })

  await fs.mkdir(fsPath.dirname(LIQ_SERVER_PID_FILE()), { recursive : true })
  await fs.writeFile(LIQ_SERVER_PID_FILE(), child.pid + '')

  const maxAttempts = 10
  const waitTime = 1000
  let started = false
  let attemptCount = 0

  while (started === false && attemptCount < maxAttempts) {
    try {
      const result = await fetch('http:127.0.0.1:32600')
      if (result.ok) {
        started = true
      }
    }
    catch (e) {
      await new Promise(resolve => setTimeout(resolve, waitTime)) // sleep
    }
    attemptCount += 1
  }

  if (started === false) {
    console.log(`Failed to connect to server after ${maxAttempts}. Check status manually`)
    process.exit(LIQ_SERVER_STATUS_WORKING)
  }
  else {
    process.exit(LIQ_SERVER_STATUS_RUNNING)
  }
}

export { start }
