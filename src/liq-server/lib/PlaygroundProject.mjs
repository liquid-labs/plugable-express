import { Item } from '@liquid-labs/resource-model'

const PlaygroundProject = class extends Item {
  constructor({ localProjectPath, npmName, orgName, packageJSON, projectName }) {
    super({
      name     : `${orgName}/${projectName}`,
      baseName : projectName,
      npmName,
      orgName,
      localProjectPath,
      packageJSON
    })
  }
}

Item.bindCreationConfig({
  itemClass : PlaygroundProject,
  itemName  : 'project',
  keyField  : 'name',
  itemsName : 'projects'
})

export { PlaygroundProject }
