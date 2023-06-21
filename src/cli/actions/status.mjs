/* global fetch */

import * as fs from 'node:fs/promises'
import { exec } from 'node:child_process'

import { LIQ_SERVER_PGREP_MATCH, LIQ_SERVER_STATUS_RECOVERABLE, LIQ_SERVER_STATUS_RUNNING, LIQ_SERVER_STATUS_STOPPED, LIQ_SERVER_STATUS_UNRECOVERABLE, LIQ_SERVER_STATUS_WORKING } from './constants'
import { LIQ_SERVER_PID_FILE } from '../../shared/locations'

const status = async() => {
  let pid
  try {
    pid = await fs.readFile(LIQ_SERVER_PID_FILE())
    try {
      await exec('pgrep', ['-q', pid])

      const fetchResult = await fetch('http://127.0.0.1:32600/')
      if (fetchResult.ok) {
        console.log('running')
        return LIQ_SERVER_STATUS_RUNNING
      }
      else {
        console.log('working')
        return LIQ_SERVER_STATUS_WORKING
      }
    }
    catch (e) {
      return LIQ_SERVER_STATUS_STOPPED
    }
  }
  catch (e) {
    if (e.code !== 'ENOENT') { throw e }
  }

  // there is no pid file
  try {
    await exec('pgrep', [LIQ_SERVER_PGREP_MATCH])

    const fetchResult = await fetch('http://127.0.0.1:32600/')
    if (fetchResult.ok) {
      console.log(`It looks like the server may be running (process $(pgrep ${LIQ_SERVER_PGREP_MATCH})), but no pidfile was found. However, the server is responsive and appears to be running properly.`)
      return LIQ_SERVER_STATUS_RECOVERABLE
    }
    else {
      console.log(`It looks like the server may be running (process $(pgrep ${LIQ_SERVER_PGREP_MATCH})), but no pidfile was found. The server was also unresponsive and should be stopped.`)
      return LIQ_SERVER_STATUS_UNRECOVERABLE
    }
  }
  catch (e) {
    console.log('stopped')
    return LIQ_SERVER_STATUS_STOPPED
  }
}

export { status }
