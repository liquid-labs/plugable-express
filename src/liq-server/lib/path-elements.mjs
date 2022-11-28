import { emailEncodedOrNotReString } from '@liquid-labs/regex-repo'

const orgKey = ({ model }) => {
  const bitReString = '[a-zA-Z0-9][a-zA-Z0-9-]*'
  const optionsFetcher = () => Object.keys(model.orgs)
  // const selectionFetcher = (key) => model.orgs[key]
  
  return { bitReString, optionsFetcher }
}

const projectName = ({ model, prevElements }) => {
  const { orgKey } = prevElements || {} // when called in the initial setup, 'prevElements' is not provided
  // TODO: this is a guess; no wifi to check allowable github project names atm
  const bitReString = '[a-zA-Z0-9][a-zA-Z0-9-_]*'
  const optionsFetcher = () => Object.keys(model.playground.orgs[orgKey].projects)
    
  return { bitReString, optionsFetcher }
}

const staffKey = ({ model, prevElements }) => {
  const { orgKey } = prevElements || {} // when called in the initial setup, 'prevElements' is not provided
  const org = model?.orgs[orgKey]
  
  const bitReString = emailEncodedOrNotReString.slice(1, -1) // cut off the beginning (and ending pins
  const optionsFetcher = () => org.staff.list({ rawData : true }).map((s) => s.id )
  // const selectionFetcher = (key) => org.staff.get(key)
  
  return { bitReString, optionsFetcher }
}

export {
  orgKey,
  projectName,
  staffKey
}
