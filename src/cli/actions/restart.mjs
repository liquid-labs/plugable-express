import { start } from './start'
import { stop } from './stop'

const restart = async() => {
  await stop()
  await start()
}

export { restart }
