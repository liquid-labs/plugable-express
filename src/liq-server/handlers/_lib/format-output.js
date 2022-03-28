import { format as formatTable } from '@fast-csv/format'
import pick from 'lodash.pick'
import { toSentenceCase } from 'js-convert-case'

import { md2x } from '@liquid-labs/liq-handlers-lib'

import { standardTitle } from './standard-title'

const outputFormats = [
  'json', // native
  // 'yaml', // equivalent data
  'csv',
  'tsv', // even though the MIME type is 'text/tab-separated-values', 'tsv' will work with express (4.17.1)
  // 'tab-separated-values',
  'markdown', // simple text
  'pdf', // binary text
  'docx'
]

const outputExtensions = {
  'markdown' : 'md',
  'tab-separated-values' : 'tsv'
}

/**
* Expects raw, clean data.
*/
const formatOutput = ({
  basicTitle='Report', // ignored if 'reportTitle' present
  data,
  fields,
  mdFormatter,
  reporter,
  reportTitle, // overrides 'basicTitle'
  req,
  res,
  ...rest
}) => {
  reportTitle = reportTitle || standardTitle({ basicTitle })
  
  const format = req.accepts(outputFormats) || 'json'
  const fileExtension = outputExtensions[format] || format
  const reportFileName = `${reportTitle}.${fileExtension}`
  
  res.attachment(reportFileName) // default name
  
  const trimmerFunc = fields && fields.length > 0
    ? (i) => pick(i, fields)
    : undefined
  
  if (format === 'json') {
    res.json(trimmerFunc ? data.map(trimmerFunc) : data)
    return
  }
  else if (format === 'csv' || format === 'tsv'){ // handle rote transformations
    const { dataFlattener, noHeaders = false } = rest
    const delimiter = format === 'csv' ? ',' : "\t"
    const { headers, data: newData } = transformForTable({ data, dataFlattener, fields, noHeaders, trimmerFunc })
    
    const stream = formatTable({
      delimiter,
      headers: noHeaders ? false : headers ? headers : true
    })
    
    stream.pipe(res)
    for (const item of newData) {
      stream.write(item)
    }
    stream.end()
    return
  }
  // else, were turning into some kind of prose...
  
  const markdown = mdFormatter(data, reportTitle)
  
  if ('markdown' === format) {
    res.type('text/markdown').send(markdown)
  }
  else { // needs to be converted to a binary file
    // SECURITY ISSUE
    // TODO: need to be working in a random tmp directory to avoid polluting, trying to write to non-writable
    // areas, and to avoid name collisions, raced conditions, and even possible data leaks.
    const binFiles = md2x({ markdown, format: fileExtension, title: reportTitle })
    
    let sendFile
    
    if (binFiles.length === 1) {
      sendFile = binFiles[0]
    }
    else {
      var zip = new AdmZip()
      for (const localFile of binFiles) {
        zip.addLocalFile(localFile)
      }
      // TODO: maybe better to do as buffer...
      // var willSendthis = zip.toBuffer();
      const zipFile = `${dateMark} - reports.zip`
      res.attachment(zipFile)
      zip.writeZip(zipFile)
    }
    
    // Notice we don't use 'fsPath.resolve', but instead use the 'relative to root' convention. The recommended
    // 'absolute path' approach requires 'dotfiles: "allow"' because the path traverses '.liq'. So, rather than
    // open up to any dotfile, we set the root, which bypasses the dotfiles check.
    res.sendFile(sendFile, { root: process.cwd() }, function (err) {
      // TODO: at one point, we were getting 'EPIPE' errors, which stackoverflow claimed where 'nothing to worry
      // about' (and the resulting file looked OK) vv
      // if (err && err.code !== 'EPIPE' && err.syscall !== 'write') {
      if (err) {
        next(err)
      }
      
      const filePath = fsPath.resolve(process.cwd(), binFiles)
      // TODO: let's verify this doesn't run afoul of race conditions. AFAIK, javascripts single-threaded nature
      fs.rm(filePath, {}, (err) => {
        if (err) {
          reporter.error(`There was an error deleting '${filePath}': ${err}`)
        }
      })
    })
  }
}

const transformForTable = ({ data, dataFlattener, fields, noHeaders, trimmerFunc }) => {
  const headersIndex = {}
  const headers = !noHeaders && fields && fields.length > 0
    ? fields.map((f) => {
      const humanField = toSentenceCase(f)
      headersIndex[f] = humanField
      return humanField
    })
    : []
  
  const fieldConverter = (item) => {
    const keys = fields || Object.keys(item)
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i]
      let humanField = headersIndex[key]
      if (humanField === undefined) {
        humanField = toSentenceCase(key)
        headersIndex[key] = humanField
        headers.splice(i, 0, humanField)
      }
      if (key !== humanField) {
        item[humanField] = item[key]
        // delete i[key] <- not really necessary since we end up specifying the header?
      }
    }
    
    return item
  }
  
  if (!dataFlattener && !trimmerFunc && noHeaders) {
    return { data }
  }
  else if (!dataFlattener && !trimmerFunc) {
    for (const i of data) {
      fieldConverter(i)
    }
    return { headers, data }
  }
  else { // there is a dataFlattener and/or trimmerFunc
    let transformer
    if (dataFlattener && trimmerFunc) {
      transformer = (i) => dataFlattener(trimmerFunc(i))
    }
    else {
      transformer = dataFlattener || trimmerFunc
    }
    
    if (noHeaders) {
      return { data: data.map(transformer) }
    }
    else {
      data = data.map(i => fieldConverter(transformer(i)))
      return { headers, data }
    }
  }
}

export { formatOutput }
