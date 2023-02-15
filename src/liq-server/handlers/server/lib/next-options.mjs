import { optionsTokenizer } from './options-tokenizer'

const nextOptionValueOptions = async ({ app, cache, lastOptionName, lastOptionParamDef, lastOptionValue, model, prevElements }) => {
  // we expect to always get a param def, otherwise the param wouldn't have been matched to get to the value
  if (!lastOptionParamDef.optionsFunc) return []
  let possibleValues = lastOptionParamDef.optionsFunc({ app, cache, model, ...prevElements })
  if (possibleValues.then) possibleValues = await possibleValues
  possibleValues.sort()
  if (possibleValues.includes(lastOptionValue)) return [lastOptionValue]
  else {
    return !lastOptionValue
      ? possibleValues // .map((v) => lastOptionName + '=' + v)
      : possibleValues.filter((v) => v.startsWith(lastOptionValue))
  } // .map((v) => lastOptionName + '=' + v)
}

const parameterOptions = ({ paramDef }) => {
  const options = []
  if (paramDef.isBoolean) options.push(paramDef.name)
  else if (paramDef.canBeEmpty) {
    options.push(paramDef.name)
    options.push(paramDef.name + '=')
  }
  else options.push(paramDef.name + '=')

  return options
}

const residualOptions = ({ command, currOptNameAndValues, lastOptionName, lastOptionParamDef, paramsSpec }) => {
  // we are listing options (not option value options), so the options are the options not already specified
  const currOptNames = currOptNameAndValues.map((o) => o[0])
  const parameterNames = paramsSpec.map((p) => p.name)

  const options = []
  // Remember 'command.endsWith("=")' is already handled.
  // Is the command is locked in, then what params not already specified?
  const lockedIn = command.endsWith(' ') // options always space separated; trivially locked in
    // v if the last option is complete and a boolean, then it's done
    || (command.endsWith(lastOptionName) && lastOptionParamDef?.isBoolean === true)
  if (lockedIn) {
    const residualOpts = parameterNames.filter((o) => !currOptNames.includes(o))
    const exclusions = currOptNames.reduce((acc, o) => {
      const excludes = paramsSpec.find((p) => p.name === o)?.excludes
      if (excludes) {
        acc.push(...excludes)
      }
      return acc
    }, [])

    for (const rOpt of residualOpts) {
      if (!exclusions.includes(rOpt)) {
        options.push(...parameterOptions({ paramDef : paramsSpec.find((p) => p.name === rOpt) }))
      }
    }
  }
  else { // check to see if we can match the last command
    if (lastOptionParamDef) { // matched, but not locked in
      options.push(...parameterOptions({ paramDef : lastOptionParamDef }))
    }
    else { // is it a partial match?
      const possibleOptions = parameterNames.filter((p) => p.startsWith(lastOptionName))
      for (const possibleOpt of possibleOptions) {
        const paramDef = paramsSpec.find((p) => p.name === possibleOpt)
        // paramDef guaranteed because we're using parameterNames built from the spec as the key
        options.push(...parameterOptions({ options, paramDef }))
      }
    }
  }

  return options
}

const nextOptions = async ({ app, cache, command, lastCmd, model, nextCommands, optionString, paramsSpec, prevElements }) => {
  if (optionString === undefined) { // possible start of options; also there may be other commands options
    if (command.endsWith(' ')) nextCommands.splice(0, 0, '--') // '--' always separated by ' '
    else nextCommands = [lastCmd]
  }
  else if (optionString === '' && command.endsWith(' --')) {
    nextCommands = ['--']
  }
  else {
    // Generates a list of [ name, value ] tuples
    const currOptNameAndValues = optionsTokenizer(optionString)
    const lastOptionName = currOptNameAndValues.length === 0
      ? ''
      : currOptNameAndValues[currOptNameAndValues.length - 1][0]
    const lastOptionParamDef = paramsSpec.find((p) => p.name === lastOptionName)
    const lastOptionValue = lastOptionParamDef && currOptNameAndValues?.[currOptNameAndValues.length - 1][1]
    // first we check if we have a '=' and calculated options
    if (lastOptionParamDef && lastOptionParamDef.isBoolean && command.endsWith(lastOptionName)) {
      nextCommands = [lastOptionName]
    }
    else if (command.endsWith('=') || (lastOptionValue && command.endsWith(lastOptionValue))) {
      nextCommands = await nextOptionValueOptions({
        app,
        cache,
        lastOptionName,
        lastOptionParamDef,
        lastOptionValue,
        model,
        prevElements
      })
    }
    else {
      nextCommands = residualOptions({
        command,
        currOptNameAndValues,
        lastOptionName,
        lastOptionParamDef,
        paramsSpec
      })
    }
  }

  return nextCommands
}

export { nextOptions }
