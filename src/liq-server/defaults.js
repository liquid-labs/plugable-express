import { initReporter } from './lib/reporter'

const LIQ_PORT = 'LIQ_PORT'

const DEFAULT_PORT = 32600 // this number is the ASCII codes for 'l', 'i', and 'q' summed and multiplied by 100. :)

const defaults = {
  [LIQ_PORT] : DEFAULT_PORT,
  reporter   : initReporter()
}

export { defaults, LIQ_PORT }
