/* global fetch */
import { LIQ_SERVER_STATUS_RECOVERABLE, LIQ_SERVER_STATUS_RUNNING } from './constants'

const reload = async() => {
  const result = await fetch('http:/127.0.0.1:32600/server/reload', { method : 'PUT' })

  if (result.ok) {
    console.log('Reload complete.')
    process.exit(LIQ_SERVER_STATUS_RUNNING)
  }
  else {
    console.error('Unknown issue requesting reload.')
    process.exit(LIQ_SERVER_STATUS_RECOVERABLE)
  }
}

export { reload }
