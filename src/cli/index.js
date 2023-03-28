import { reload } from './actions/reload'
import { restart } from './actions/restart'
import { start } from './actions/start'
import { status } from './actions/status'
import { stop } from './actions/stop'

const action = process.argv[2];

(async() => {
  switch (action) {
  case 'reload': await reload(); break
  case 'restart': await restart(); break
  case 'start': await start(); break
  case 'status': process.exit(await status())
  case 'stop': await stop(); break
  default:
    throw new Error(`Unknown action '${action}'.`)
  }
})()
