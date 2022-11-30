import { optionsTokenizer } from './options-tokenizer'

const nextOptionValueOptions = ({ lastOptionName, paramsSpec }) => {
  const paramDef = paramsSpec.find((o) => o.name === lastOptionName)
  // we expect paramsSpec has been validated upstream so should always get a paramDef
  return paramDef?.optionsFunc?.().sort() || []
}

const parameterOptions = ({ options, paramDef }) => {
  if (paramDef.isBoolean) options.push(paramDef.name)
  else if (paramDef.canBeEmpty) {
    options.push(paramDef.name)
    options.push(paramDef.name + '=')
  }
  else options.push(paramDef.name + '=')
}

const residualOptions = ({ command, currOptNameAndValues, lastOptionName, paramsSpec }) => {
  // we are listing options (not option value options), so the options are the options not already specified
  const currOptNames = currOptNameAndValues.map((o) => o[0])
  const parameterNames = paramsSpec.map((p) => p.name)
  
  const options = []
  // Remember 'command.endsWith("=")' is already handled.
  // Is the command is locked in, then what params not already specified?
  if (command.endsWith(' ')
     || (currOptNameAndValues.length > 0 && currOptNameAndValues[currOptNameAndValues.length - 1][1])
     || (command.endsWith(lastOptionName) && paramsSpec.find((p) => p.name === lastOptionName)?.isBoolean === true)) {
    const residualOpts = parameterNames.filter((o) => !currOptNames.includes(o))
    for (const rOpt of residualOpts) {
      parameterOptions({ options, paramDef: paramsSpec.find((p) => p.name === rOpt)})
    }
    
    // options.push(...parameterNames.filter((o) => !currOptNames.includes(o)))
  }
  else { // check to see if we can match the last command
    const paramDef = paramsSpec.find((p) => p.name === lastOptionName)
    if (paramDef) { // matched, but not locked in
      parameterOptions({ options, paramDef })
    }
    else { // is it a partial match?
      const possibleOptions = parameterNames.filter((p) => p.startsWith(lastOptionName))
      for (const possibleOpt of possibleOptions) {
        const paramDef = paramsSpec.find((p) => p.name === possibleOpt)
        // paramDef guaranteed because we're using parameterNames built from the spec as the key
        parameterOptions({ options, paramDef })
      }
    }
  }

  return options
}

const nextOptions = ({ command, nextCommands, optionString, paramsSpec }) => {
  try {
  if (optionString === undefined) { // possible start of options; also there may be other commands options
    nextCommands.splice(0, 1, '--')
  }
  else if (optionString || optionString === '') {
    // Generates a list of [ name, value ] tuples
    const currOptNameAndValues = optionsTokenizer(optionString)
    const lastOptionName = currOptNameAndValues.length === 0
      ? ''
      : currOptNameAndValues[currOptNameAndValues.length - 1][0]
    // first we check if we have a '=' and calculated options
    if (command.endsWith('=')) { // note 'lastOptionName' has been has been tokenized and will have had the '=' removed
      nextCommands = nextOptionValueOptions({ lastOptionName, paramsSpec })
    }
    else {
      nextCommands = residualOptions({ command, currOptNameAndValues, lastOptionName, paramsSpec })
    }
  }

  return nextCommands
  } catch (e) { console.error(e)}
}

export { nextOptions }
