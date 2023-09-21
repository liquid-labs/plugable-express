const printPath = (path) => '/' + (path ? path.map(p => p.replace(/[?]$/, '')).join('/') : '')

export { printPath }
