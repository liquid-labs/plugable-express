import { Readable } from 'stream'
import * as StreamPromises from 'stream/promises'
import { parse as parseCSV } from '@fast-csv/parse'

import { field, validateAndNormalizeHeaders, validadteAndNormalizeRecords } from './lib/staff-import-lib'

const verb = 'put'
const path = '/orgs/:orgName/staff'

const func = ({ model }) => (req, res) => {
  const { files } = req
  const records = []
  const pipelines = []
  
  const processRecord = (record) => records.push(record)
  
  let totalRecords = 0
  for (const fileName of Object.keys(files)) {
    // TODO: can I reuse the same stream?
    const parserStream = parseCSV({
        headers : validateAndNormalizeHeaders,
        trim : true
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
    
    const file = files[fileName]
    const fileDataBuffer = file.data
    const fileDataString = fileDataBuffer.toString()
    const fileDataStream = Readable.from(fileDataString)
    
    pipelines.push(StreamPromises.pipeline(fileDataStream, parserStream))
  }

  Promise.all(pipelines)
    .then(() => {
      try {
        const normalizedRecords = validadteAndNormalizeRecords(records)
        res.json(normalizedRecords)
      }
      catch (e) { // the normalization functions will throw if they encounter un-processable data
        // TODO: it would be nicer to let the record exist in an "invalid" state and continue processing what we can
        res.status(400).json({ message: e.message })
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
