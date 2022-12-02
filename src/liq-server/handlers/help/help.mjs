import { sendHelp } from './lib/send-help'

const method = 'get'
const path = [ 'help' ]

const help = {
  name: "help",
  summary: "To get help on a command/endpoint, you can prepend or append 'help' to the path or CLI command sequence.",
  description: "The help system provides information about each command or endpoint. You can always get the path, basic and parameter information. Summary and description information is usually included as well. Finally, optional references may be listed.\n\nHelp is invoked by either prepending or appending 'help' to the URL or command sequence. e.g.: 'help orgs list' or 'orgs list help'. The default is for liq to retrieve help as a 'terminal' document for display in a command-line terminal with nice colored formatting. If this is causing problems, try setting `format=txt`. You can of course also use the `format` option to select markdown, or even data formats as well."
}

const { func, parameters } = sendHelp({ help, method, path })

export { func, parameters, path, method }
