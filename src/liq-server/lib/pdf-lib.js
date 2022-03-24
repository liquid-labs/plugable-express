import shell from 'shelljs'

const md2x = ({ markdown, format = 'pdf', title = 'Report', singlePage = false, sources }) => {
  const sourceSpec = `${sources ? `'${sources.join("' '")}'` : '-'}`
  const options = `--list-files --title '${title}' --output-format ${format} ${singlePage ? '--single-page ' : ''}`
  const command =
    `$(npm bin)/md2x ${options} ${sourceSpec}`
  const result = shell
    .ShellString(markdown)
    .exec(command, { silent : true, shell : '/bin/bash' })

  if (result.code !== 0) {
    throw new Error(`Could not covert file to '${format}': (${result.code}) ${result.stdout}`)
  }

  return result.toString().split('\n').filter((f) => f.length > 0)
}

export { md2x }
