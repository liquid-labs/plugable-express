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

const loadPlayground = ({
  LIQ_PLAYGROUND_PATH=`${process.env.HOME}/.liq/playground`
}) => {
  
  console.log(`Loading playground from: ${LIQ_PLAYGROUND_PATH}`)
  
  const playground = {
    projects: {},
  }
  
  const orgDirs = filterLiqCotents({
    files: fs.readdirSync(LIQ_PLAYGROUND_PATH, { withFileTypes: true }),
    basePath: LIQ_PLAYGROUND_PATH
  });
  
  for (const orgDir of orgDirs) {
    const orgName = orgDir.name
    console.log(`Processing org: ${orgName}...`)
    const basePath = `${LIQ_PLAYGROUND_PATH}/${orgName}`
    const projectDirs = filterLiqCotents({
        files: fs.readdirSync(basePath, { withFileTypes: true }),
        basePath
      })
    
    console.log(`Loading ${projectDirs.length} projects...`)
    for (const projectDir of projectDirs) {
      const projectName = projectDir.name
      const projectPath = `${basePath}/${projectName}`
      const project = loadPlaygroundProject({
        projectName,
        projectPath,
        orgName
      })
      
      playground.projects[project.fullName] = project
    }
  }
  
  console.log('Indexing data...')
  indexPlayground(playground)
  return playground
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
  const packageJSON = readPackageJSON(projectPath)
  
  return {
    fullName: `${orgName}/${projectName}`,
    name: projectName,
    orgName,
    packageJSON
  }
}

const indexPlayground = (playground) => {
  const projects = Object.values(playground.projects)
  const projectsAlphaList = []
  const orgs = {}
  const orgsAlphaList = []
  
  for (const project of projects) {
    const { fullName, name, orgName } = project
    
    if (orgs[orgName] === undefined) {
      orgs[orgName] = {
        projectsAlphaList : [],
        projects : {}
      }
      orgsAlphaList.push(orgName)
    }
    
    const org = orgs[orgName]
    org.projects[name] = project
    org.projectsAlphaList.push(name)
    
    projectsAlphaList.push(fullName)
  }
  
  // now to sort all the names
  projectsAlphaList.sort()
  orgsAlphaList.sort()
  for (const orgName of orgsAlphaList) {
    orgs[orgName].projectsAlphaList.sort()
  }
  
  playground.projectsAlphaList = projectsAlphaList
  playground.orgs = orgs
  playground.orgsAlphaList = orgsAlphaList
}

export { loadPlayground }
