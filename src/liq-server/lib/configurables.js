// TODO: make this a small project

const initializeConfiguration = (sources) => {
  // TODO: if not defined in options, look in env. Otherwise, look at defaults'
  const get = (name) => {
    for (const source of sources) {
      if (source[name]) {
        return source[name]
      }
    }
    return undefined
  }

  return {
    get : (name) => get(name)
  }
}

export { initializeConfiguration }
