import * as fs from 'node:fs'
import * as fsPath from 'node:path'

const filterLiqCotents = ({ files, basePath, reporter = console }) =>
  files.filter((file) => {
    // silently ignore non-dirs and hidden stuff
    if (file.name.startsWith('.') || !file.isDirectory()) return false

    const candidate = fsPath.join(basePath, file.name)
    // ignore marked dirs with note
    if (fs.existsSync(fsPath.join(candidate, '.liq-ignore'))) {
      reporter.log(`Ignoring '${file.name}' due to '.liq-ignore marker.'`)
      return false
    }

    return true
  })

/**
* Given a root playground path, loads the playground model.
*/
const loadPlayground = ({
  LIQ_PLAYGROUND_PATH = process.env.LIQ_PLAYGROUND_PATH || fsPath.join(process.env.HOME, '.liq', 'playground'),
  reporter = console
}) => {
  reporter.log(`Loading playground from: ${LIQ_PLAYGROUND_PATH}`)

  const playground = {
    projects          : {},
    projectsByDir     : {},
    projectsByNPMName : {}
  }

  const orgDirs = filterLiqCotents({
    files    : fs.readdirSync(LIQ_PLAYGROUND_PATH, { withFileTypes : true }),
    basePath : LIQ_PLAYGROUND_PATH,
    reporter
  })

  for (const orgDir of orgDirs) {
    const orgName = orgDir.name
    reporter.log(`Processing org: ${orgName}...`)
    const basePath = fsPath.join(LIQ_PLAYGROUND_PATH, orgName)
    const projectDirs = filterLiqCotents({
      files : fs.readdirSync(basePath, { withFileTypes : true }),
      basePath
    })

    reporter.log(`Loading ${projectDirs.length} projects...`)
    for (const projectDir of projectDirs) {
      const projectName = projectDir.name
      const localProjectPath = fsPath.join(basePath, projectName)
      try {
        const project = loadPlaygroundProject({
          projectName,
          localProjectPath,
          orgName
        })

        playground.projects[project.fullName] = project
        playground.projectsByDir[project.localProjectPath] = project
        const npmName = project.packageJSON?.name
        if (npmName === undefined) {
          reporter.warn(`Project '${project.fullName}' does not define an NPM package and/or package name.`)
        }
        else {
          playground.projectsByNPMName[npmName] = project
        }
      }
      catch (e) {
        console.log(e)
        if (e instanceof SyntaxError) {
          reporter.warn(`\nWARNING: skipping project '${projectName}'; it is likely the 'package.json' file is malformed.`)
        }
        else {
          throw e
        }
      }
    }
  }

  reporter.log('Indexing data...')
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
  const packageJSONPath = fsPath.join(basePath, 'package.json')
  return safeJSONParse(packageJSONPath)
}

const loadPlaygroundProject = ({ localProjectPath, projectName, orgName }) => {
  const packageJSON = readPackageJSON(localProjectPath)

  return {
    fullName : `${orgName}/${projectName}`,
    name     : projectName,
    orgName,
    localProjectPath,
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
        projects          : {}
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

export { loadPlayground, safeJSONParse }
