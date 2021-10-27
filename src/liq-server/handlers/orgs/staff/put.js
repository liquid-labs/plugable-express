import { Readable } from 'stream'
import * as StreamPromises from 'stream/promises'
import { parse as parseCSV } from '@fast-csv/parse'

import { field, validateAndNormalizeHeaders, validateAndNormalizeRecords } from './lib/staff-import-lib'

const verb = 'put'
const path = '/orgs/:orgKey/staff'

const func = ({ model }) => (req, res) => {
  // we won't use the org for awhile, but if the org path is invalid, then there's no point in doing other work
  const { orgKey } = req.params
  const org = model.orgs[orgKey]
  if (!org) {
    res.status(400).json({ message: `Could not locate org '${orgKey}'.` })
  }
  
  const { files } = req
  const records = []
  const pipelines = []
  
  const processRecord = (record) => records.push(record)
  
  let totalRecords = 0
  for (const fileName of Object.keys(files)) {
    // TODO: can I reuse the same stream?
    const parserStream = parseCSV({
        headers : validateAndNormalizeHeaders(fileName),
        trim : true,
        ignoreEmpty : true
      })
      .on('error', (error) => {
        // TODO: could build up errors from multiple files for better user experience
        // it's possible the other file died already
        if (res.headersSent) return
        res.status(400).json({ message: error.message })
        // note, the error is also impmlicitly thrown (I believe; haven't worked with Streams much, but that's
        // consistent with the observed behavior) TODO: improve this note
      })
      .on('data', processRecord)
      .on('end', (recordCount) => totalRecords += recordCount)
    
    const fileDataStream = Readable.from(files[fileName].data.toString())
    
    pipelines.push(StreamPromises.pipeline(fileDataStream, parserStream))
  }

  Promise.all(pipelines)
    .then(() => {
      let normalizedRecords
      try {
        normalizedRecords = validateAndNormalizeRecords(records)
      }
      catch (e) { // the normalization functions will throw if they encounter un-processable data
        // TODO: it would be nicer to let the record exist in an "invalid" state and continue processing what we can
        res.status(400).json({ message: e.message })
      }
      
      const keepList = []
      const errors = []
      const actions = []
      const actionSummary = []
      let requiresHydration = false
      for (const newRecord of normalizedRecords) {
        const { email, title: titleSpec } = newRecord
        newRecord.roles = []
        
        keepList.push(email)
        
        const currRecord = org.staff.get(email)
        
        const titles = titleSpec.split(/\s*\+\s*/)
        
        titles.forEach((title, i) => {
          const [ role, qualifier ] = org.roles.get(title, { fuzzy: true, includeQualifier: true })
          if (role === undefined) {
            errors.push(`Could not find role for title '${title}' while processing staff record for '${email}'.`)
            return
          }
          
          // TODO: we could skip the pre-emptive creation once we update later processing to ignore / drop non-truthy 'qualifier' entries
          const roleDef = { name: role.getName() }
          if (qualifier) roleDef.qualifier = qualifier
          
          if (currRecord === undefined) {
            newRecord.roles.push(roleDef)
          }
          else if (!currRecord.roles.some((r) => r.name === role.getName())) {
            currRecord.roles.push(roleDef)
            requiresHydration = true
            actionSummary.push(`Added role '${role.getName()}' to '${email}'.`)
            // TODO: update other fields
          }
        }) // multi-title forEach loop
        
        if (currRecord === undefined) {
          actions.push(() => {
            try {
              org.staff.addData(newRecord, { deferHydration: true })
              requiresHydration = true
              actionSummary.push(`Created new user '${email}' as ${newRecord.roles.map((r) => r.name)}`)
            }
            catch (e) {
              errors.push(`There was an error while trying to add '${email}': ${e.message}`)
            }
          })
        }
      } // record processing loop
      
      // now we check for deletes
      for (const currRecord of org.staff.list()) {
        const { email, employmentStatus } = currRecord
        if (employmentStatus !== 'board' && employmentStatus !== 'logical'
            && !keepList.some((keepEmail) => keepEmail.toLowerCase() === email.toLowerCase())) {
          actions.push(() => {
            try {
              org.staff.remove(email)
            }
            catch (e) {
              errors.push(`Error removing '${email}': ${e.message}`)
            }
          })
          actionSummary.push(`Removed staff member '${email}'.`)
        }
      }
      
      if (errors.length > 0) {
        const message = errors.length === 1
          ? `There was an error in the input data: ${errors[0]}`
          : `There were errors in the input data:\n* ${errors.join("\n* ")}`
        res.status(400).json({ message })
      }
      else {
        for (const action of actions) {
          action()
        }

        if (requiresHydration) {
          try {
            org.staff.hydrate(org)
          }
          catch (e) {
            errors.push(`There was a problem while hydrating the updated staff: ${e.message}`)
          }
        }
        
        if (errors.length > 0) {
          // reset the data
          model.initialize()
          
          const message = errors.length === 1
            ? `There was an error updating the staff model: ${errors[0]}`
            : `There were errors updating the staff model:\n* ${errors.join("\n* ")}`
          res.status(500).json({ message })
          return
        }
        // else, no errors so far
        try {
          org.staff.write()
          res.json({ actionSummary })
        }
        catch (e) {
          res.status(500).json({ message: `There was a problem saving the updated staff: ${e.message}` })
          // reset the data
          model.initialize()
        }
      }
    })
    .catch((error) => {
      if (res.headersSent) return
      // if there were problems with the parsing, the result would have already been sent with the '.on('error', ...)'
      // handler; so this is something else and we'll assume a 500
      res.status(500).json({ message: error.message })
    })
}

export { func, path, verb }
