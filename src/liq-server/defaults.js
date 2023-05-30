import { Reporter } from './lib/reporter'

const LIQ_PORT = 'LIQ_PORT'
const DEFAULT_PORT = 32600 // this number is the ASCII codes for 'l', 'i', and 'q' summed and multiplied by 100. :)

const LIQ_REGISTRIES = 'LIQ_REGISTRTIES'
const DEFAULT_REGISTRIES = ['https://github.com/liquid-labs/liq-registry/blob/main/package.json']

const defaults = {
  [LIQ_PORT]   : DEFAULT_PORT,
  [LIQ_REGISTRIES] : DEFAULT_REGISTRIES,
  reporter     : new Reporter()
}

export { defaults, LIQ_PORT, LIQ_REGISTRIES }
