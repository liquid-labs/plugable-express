class RolesAccessLib {
  constructor(org) {
    // initializes:
    // this.accessRules,
    // this.domainServices
    Object.assign(this, org.innerState.roleAccess)
    org.rolesAccess = this
    this.org = org
    
    this.directRulesByRole = {}
    this.domains = []
    this.domainsToIndexMap = {}
    this.errors = []
    this.verifyAndIndexData()
  }
  
  verifyAndIndexData() {
    // TODO: It's actually more like 'roleRules'
    for (const { role, access = [], policy = [] } of this.accessRules) {
      // verify the role is known
      if (role !== 'Staff' && this.org.roles.get(role) === undefined) {
        this.errors.push(`No such role '${role}' as referenced from 'access roles'.`)
      }
      
      // track the unique domains
      for (const { domain } of access) {
        if (this.domainsToIndexMap[domain] === undefined) {
          this.domainsToIndexMap[domain] = this.domains.length
          this.domains.push(domain)
        }
      }
      
      this.directRulesByRole[role] = { access , policy }
    } // for this.accessRules loop
  }
  
  getIndexForDomain(domain) {
    return this.domainsToIndexMap[domain]
  }
  
  // TODO: could be static, except then not visible from instance; could append, or just leave.
  accessRulesToSummaries(row) {
    return row.map((e, i) => { // each row, which is a collection
      if (i === 0) return e
      else if (e === null) {
        return ''
      }
      else {
        e.sort((a, b) => { // notice we are caching the rank
          const aRank = a.rank || accessRank(a)
          a.rank = aRank
          const bRank = b.rank || accessRank(b)
          b.rank = bRank
          return aRank > bRank ? -1 : aRank < bRank ? 1 : 0
        })
        
        let priorRule = null
        e = e.filter((ar) => {
          const { rank, scope } = ar
          const priorRank = priorRule?.rank
          // updates prior rule and returns true if it can pass the gauntlet
          // always keep the first rule and if the prior rule has a (+) rank and the curr rule (-), it's of a
          // different kind and we keep
          if (priorRule !== null && !(priorRank > 0 && rank < 0)) {
            const priorTypeRank = Math.floor(priorRank / 2)
            const currTypeRank = Math.floor(rank / 2)
            // if curr and prior rules are the same or same type, then discard the curr, possibly smaller scope rule
            if (priorTypeRank === currTypeRank) return false
            // else, the curr rule is a lower rank, so if the higher rank is unlimited, we don't need it
            else if (priorRule.scope === 'unlimited') return false
            // and if neither are unlimited, then we don't need the lower rank rule either
            else if (scope !== 'unlimited') return false
            // otherwise we keep it
          }
          
          priorRule = ar
          return true
        })

        return e.map(({ type, scope }) =>
            `${type}${scope === 'unlimited' ? '*' : ''}`
          ).join('; ')
      }
    })
  }
}

const accessRank = ({ type, scope }) => {
  let result = 0
  switch (type) {
    case 'reader': result = 2; break
    case 'editor': result = 4; break
    case 'manager': result = 6; break
    case 'access-manager': result = -2; break
    default: throw new Error(`Found unknown access type '${type}'`)
  }
  if (scope === 'unlimited') result += 1
  
  return result
}

const initializeRolesAccess = (org) =>
  org.rolesAccess instanceof RolesAccessLib
    ? org.rolesAccess
    : new RolesAccessLib(org)

export { initializeRolesAccess }
