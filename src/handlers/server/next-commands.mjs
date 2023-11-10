import { nextOptions } from './_lib/next-options'

const help = {
  name        : 'Next commands',
  summary     : 'Given a partial or incomplete command string, lists possible "next commands" to complete or follow the given partial.',
  description : 'Given a partial or incomplete command string, lists possible "next commands" to complete or follow the given partial. The provided command string may be blank. This is used primarily to support the built-in shell tab-completion support, allowing the server to generate possible completions dynamically as plugins are loaded and removed.'
}

const method = 'get'
const path = ['server', 'next-commands']
const parameters = [
  {
    name        : 'command',
    description : "The (URL) path so far and optional '--' plus options."
  }
]

const CLI_STYLE = ' '
const URL_STYLE = '/'

const func = ({ app, cache }) => async(req, res) => {
  try {
    const format = req.accepts(['json', 'text'])
    const { command = '/' } = req.query

    const [commandPath, optionString] = command.split(/\s*--\s*/)

    let frontier = app.ext.commandPaths
    const cmdsWalked = []
    const prevElements = {}
    let cmdSep
    let cmdsLeft
    const firstSpace = commandPath.indexOf(' ')
    const firstSlash = commandPath.indexOf('/')
    if (commandPath.indexOf('/') === -1 || (firstSpace !== -1 && firstSpace < firstSlash)) { // then it's the CLI form
      cmdSep = CLI_STYLE
      cmdsLeft = commandPath.split(/\s+/)
      cmdsLeft.shift() // drop the leading cli command that we see in this form
    }
    else { // command is in URL form
      cmdSep = URL_STYLE
      cmdsLeft = commandPath.split('/')
      cmdsLeft.shift() // drop '' from leading '/'
    }
    if (cmdsLeft[cmdsLeft.length - 1].match(/^\s*$/)) { // TODO: this may not be necessary
      cmdsLeft.pop()
    }

    let unmatchedFinalCommand = null
    let finalOptions
    while (cmdsLeft.length > 0) {
      finalOptions = []
      const commandBit = cmdsLeft.shift().replace(/\s+$/, '')
      if (commandBit === '') break // TODO: ???

      cmdsWalked.push(commandBit)
      if (commandBit in frontier) {
        frontier = frontier[commandBit]
      }
      else { // the frontier says ':orgKey' and we have 'orgA' or whatever
      // TODO: document: you may only have one variable option element at any particular node in the tree
        let foundVariablePathElement = null
        for (const fKey of Object.keys(frontier)) {
          if (fKey.startsWith(':')) {
            /* We're going to try and relax this rule
            if (foundVariablePathElement !== null) {
              throw new Error(`Illegal multiple variable path branch possibilities: ${cmdsWalked.join(cmdSep)}${cmdSep}(${foundVariablePathElement}|${fKey})`)
            } */
            foundVariablePathElement = fKey
            const typeKey = fKey.slice(1)
            prevElements[typeKey] = commandBit // save the value of the variable
            const elementConfig = app.ext.pathResolvers[typeKey]
            const { bitReString, optionsFetcher } = elementConfig
            let myOptions = optionsFetcher({ app, cache, currToken : commandBit, ...prevElements })
            if (myOptions?.then) myOptions = await myOptions
            if (myOptions?.length > 0) finalOptions.push(...myOptions)

            if (bitReString
                && commandBit.match(new RegExp('^' + bitReString + '$'))
                && finalOptions.includes(commandBit)) {
              frontier = frontier[fKey]
              break // there may be other possibilities, but once we have a match, we move on.
            }
            else {
              foundVariablePathElement = null
            }
          }
        }

        if (foundVariablePathElement === null) {
          if (cmdsLeft.length === 0) {
            unmatchedFinalCommand = commandBit
          }
          else { // we don't have anything for an unmatched middle command
            switch (format) {
            case 'text':
              res.type('txt').send(); break
            default: // json
              res.json([])
            }
            return
          }
        }
      }
    }

    let nextCommands
    if (unmatchedFinalCommand && command.endsWith(unmatchedFinalCommand)) {
      nextCommands = Object.keys(frontier).concat(finalOptions).filter((k) => k.startsWith(unmatchedFinalCommand))
    }
    else {
      let maybeOptions = false
      nextCommands = await Object.keys(frontier)
        .reduce(async(acc, k) => {
          acc = await acc
          if (k.startsWith(':')) {
            const elementConfig = app.ext.pathResolvers[k.slice(1)] // this should already be validated
            const { optionsFetcher } = elementConfig
            let fOpts = optionsFetcher({ app, cache, currToken : '', req, ...prevElements })
            if (fOpts?.then) fOpts = await fOpts
            acc.push(...fOpts)
          // acc.push(...optionsFetcher({ currToken: '', ...prevElements }))
          }
          // the blank happens because the root command is '', but it doesn't make sense to reflect it back
          // '_' vars are either hidden (if actually options) or internal vars
          else if (k !== '' && !k.startsWith('_')) {
            acc.push(k)
          }
          else if (k === '_parameters') {
            maybeOptions = true
          }
          // else it's '' or a '_' var that isn't _parameters

          return acc
        }, [])
      // TODO: v is that necessary? Doesn't '_parameters' occur on it's own?
      nextCommands.sort() // nice, and also puts '_parameters' first (remmember, we require unique paths, so there is only ever one)

      const lastCmd = cmdsWalked.length === 0 ? '' : cmdsWalked[cmdsWalked.length - 1]
      if (maybeOptions === true) {
        nextCommands = await nextOptions({
          app,
          cache,
          command,
          lastCmd,
          nextCommands,
          optionString,
          paramsSpec : frontier._parameters(),
          prevElements,
          req
        })
      }
      else if (!command.endsWith(cmdSep) && cmdsWalked.length > 0) {
        nextCommands = [cmdsWalked.pop()]
      }
    }

    switch (format) {
    case 'text':
      res.type('txt').send(nextCommands.join('\n')); break
    default: // json
      res.json(nextCommands)
    }
  }
  catch (e) { console.error(e); throw e }
}

export { func, help, method, parameters, path }
