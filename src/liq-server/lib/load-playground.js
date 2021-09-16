import * as fs from 'fs'

const filterLiqCotents = ({ files, basePath }) =>
  files.filter((file) => {
    // silently ignore non-dirs and hidden stuff
    if (file.name.startsWith('.') || !file.isDirectory()) return false
    
    const candidate = `${basePath}/${file.name}`
    // ignore marked dirs with note
    if (fs.existsSync(`${candidate}/.liq-ignore`)) {
      console.log(`Ignoring '${file.name}' due to '.liq-ignore marker.'`)
      return false
    }
    
    return true
  })

const loadPlayground = () => {
  const playground = {
    projects: {}
  }
  
  const PLAYGROUND_PATH = `${process.env.HOME}/.liq/playground`
  const orgDirs = filterLiqCotents({
    files: fs.readdirSync(PLAYGROUND_PATH, { withFileTypes: true }),
    basePath: PLAYGROUND_PATH
  });
  for (const orgDir of orgDirs) {
    const orgName = orgDir.name
    console.log(`Processing org: ${orgName}...`)
    const basePath = `${PLAYGROUND_PATH}/${orgName}`
    const projectDirs = filterLiqCotents({
        files: fs.readdirSync(basePath, { withFileTypes: true }),
        basePath
      })
    
    for (const projectDir of projectDirs) {
      const projectName = projectDir.name
      const projectPath = `${basePath}/${projectName}`
      const project = loadPlaygroundProject({
        projectName,
        projectPath,
        orgName, projectName: projectDir.name
      })
      
      playground.projects[project.fullName] = project
    }
    
    indexPlayground(playground)
    
    console.log(`Org processed: ${orgName}`)
    return playground
  }
}

// TODO: make this a micro-package
const safeJSONParse = (path) => {
  if (!fs.existsSync(path)) return null
  
  const bits = fs.readFileSync(path)
  try {
    return JSON.parse(bits)
  }
  catch (e) {
    if (e instanceof SyntaxError) {
      throw new SyntaxError(`${e.message} while processing ${path}`)
    }
    else {
      throw e
    }
  }
}

const readPackageJSON = (basePath) => {
  const packageJSONPath = `${basePath}/package.json`
  return safeJSONParse(packageJSONPath)
}

const loadPlaygroundProject = ({ projectPath, projectName, orgName }) => {
  console.log(`Loading project ${orgName}/${projectName}...`)
  
  const packageJSON = readPackageJSON(projectPath)
  
  return {
    fullName: `${orgName}/${projectName}`,
    name: projectName,
    packageJSON
  }
}

const indexPlayground = (playground) => {
  const projects = Object.values(playground.projects)
  // for (const project of )
}

export { loadPlayground }
