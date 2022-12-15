import shell from 'shelljs'

const SSH_ACCESS_FAILURE_MSG='Test for SSH access to GitHub failed. Try to add your GitHub key like:\n\nssh-add /path/to/key'

const checkGitHubSSHAccess = ({ res, quiet=false }) => {
  // the expected resut is idiomaticaly 1 because GitHub does not allow terminal access. But if the connection cannot be made, then the exit 
  // code is different.
  const result = shell.exec('ssh -qT git@github.com 2> /dev/null')
  if (result.code !== 1) {
    if (res) {
      res.status(401).type('text/plain').send(quiet === true ? '' : SSH_ACCESS_FAILURE_MSG)
    }
    else if (quiet !== true) {
      console.error(SSH_ACCESS_FAILURE_MSG)
    }
    return false
  }
  return true
}

export { checkGitHubSSHAccess }