import { emailReString } from '@liquid-labs/regex-repo'

const orgKey = ({ model }) => {
  const bitReString = '[a-z0-9][a-z0-9-]*'
  const optionsFetcher = () => Object.keys(model.orgs)
  // const selectionFetcher = (key) => model.orgs[key]
  
  return { bitReString, optionsFetcher }
}

const staffKey = ({ model, prevElements }) => {
  const { orgKey } = prevElements || {} // when called in the initial setup, 'prevElements' is not provided
  const org = model.orgs[orgKey]
  
  const bitReString = emailReString
  const optionsFetcher = () => org.staff.list({ rawData : true }).map((s) => s.id )
  // const selectionFetcher = (key) => org.staff.get(key)
  
  return { bitReString, optionsFetcher }
}

export {
  orgKey,
  staffKey
}
