import shell from 'shelljs'

const md2x = ({ markdown, format='pdf', title='Report' }) => {
  const result = shell
    .ShellString(markdown)
    .exec(`$(npm bin)/md2x --title '${title}' --output-format ${format} -`, { silent: true, shell: '/bin/bash' })
    
  return `${title}.${format}`
}

export { md2x }
