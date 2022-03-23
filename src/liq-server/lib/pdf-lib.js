import shell from 'shelljs'

const md2x = ({ markdown, format = 'pdf', title = 'Report' }) => {
  const result = shell
    .ShellString(markdown)
    .exec(`$(npm bin)/md2x --title '${title}' --output-format ${format} -`, { silent : true, shell : '/bin/bash' })

  if (result.code !== 0) {
    throw new Error(`Could not covert file to '${format}': (${result.code}) ${result.stdout}`)
  }

  return `${title}.${format}`
}

export { md2x }
