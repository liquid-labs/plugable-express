class RolesAccessLib {
  constructor(org) {
    // console.log(orgState.innerState) // DEBUG
    // initializes:
    // this.accessRules,
    // this.domainServices
    Object.assign(this, org.innerState.roleAccess)
    org.rolesAccess = this
    this.org = org
    
    this.errors = []
    this.verifyData()
  }
  
  verifyData() {
    for (const accessRule of this.accessRules) {
      const { role, access } = accessRule
      
      if (this.org.roles.get(role) === undefined) {
        this.errors.push(`No such role '${role}' as referenced from 'access roles'.`)
      }
    }
  }
}

const initializeRolesAccess = (org) =>
  org.rolesAcess instanceof RolesAccessLib
    ? org.rolesAccess
    : new RolesAccessLib(org)

export { initializeRolesAccess }
