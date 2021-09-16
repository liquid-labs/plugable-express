// TODO: make this a small project

const bindConfigSources = (sources) => {
  // TODO: if not defined in options, look in env. Otherwise, look at defaults'
  const getConfigurableValue = (name) => {
    for (const source of sources) {
      if (source[name]) {
        return source[name]
      }
    }
    return undefined
  }
    
  return {
    getConfigurableValue: (name) => getConfigurableValue(name)
  }
}
   
export { bindConfigSources }
