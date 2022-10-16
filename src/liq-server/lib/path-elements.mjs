import { emailReString } from '@liquid-labs/regex-repo'

const orgKey = ({ model }) => {
  const bitReString = '[a-z0-9][a-z0-9-]*'
  const fetcher = () => Object.keys(model.orgs)
  
  return { bitReString, fetcher }
}

const staffKey = ({ model, org }) => {
  const bitReString = emailbitReString
  const fetcher = () => org.staff.list({ rawData : true }).map((s) => s.id )
  
  return { bitReString, fetcher }
}

export {
  orgKey,
  staffKey
}
