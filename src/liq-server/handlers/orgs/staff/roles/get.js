import * as fs from 'fs'
import * as fsPath from 'path'

import AdmZip from 'adm-zip'
import kebabCase from 'lodash.kebabcase'

import { md2x } from '../../../../lib/pdf-lib'

const method = 'get'
const path = '/orgs/:orgKey/staff/roles' // TODO: shouldn't this actually end end a '/'?
const parameters = []

const func = ({ cache, model, reporter }) => (req, res, next) => {
  const { orgKey } = req.params
  const org = model.orgs[orgKey]
  
  const roles = org.roles.list()
  
  const format = req.accepts(['json','pdf','markdown','docx']) || 'json'
  
  const fileExtension = format === 'markdown' ? 'md' : format
  
  // first, we calculate what the file name. It's useful to set 'Content-disposition' for all formats
  const now = new Date()
  const zeroPad = (number) => new String(number).padStart(2, '0')
  const dateMark =
    now.getUTCFullYear() + '.'
    + zeroPad(now.getUTCMonth() + 1) + '.'
    + zeroPad(now.getUTCDate()) + '.'
    + `${[now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()].map(v => zeroPad(v)).join('')}ZUTC`
  const reportTitle = `${dateMark} - Roles Report`
  const reportFileName = `${reportTitle}.${fileExtension}`
  res.attachment(reportFileName)
  
  switch (format) {
    case 'json':
      res.json(roles); break
    case 'docx':
    case 'pdf':
    case 'markdown':
      const markdownBuf = []
      for (const { name, summary, superRole, implies = [] } of roles) {
        markdownBuf.push(
          `## ${name}\n`,
          "### Summary\n",
          summary+"\n"
        )
        if (superRole || implies.length > 0) {
          markdownBuf.push("### Implies\n")
          if (superRole && implies.findIndex((i) => i.name === superRole.name) === -1) {
            implies.unshift({ name: superRole.name, mngrProtocol: 'self' })
          }
          for (const { name: impliedName } of implies) {
            markdownBuf.push(`- [${impliedName}](#${kebabCase(impliedName)})`)
          }
          markdownBuf.push("\n")
        }
      }
      const markdown = markdownBuf.join("\n")
      if ('markdown' === format) {
        res.type('text/markdown').send(markdown)
      }
      else { // then it's a 'binary' type; pdf or docx
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
      break
  }
}

export { func, method, parameters, path }
