const zeroPad = (number) => new String(number).padStart(2, '0')

const standardTitle = ({ basicTitle }) => {
  const now = new Date()
  
  const dateMark =
    now.getUTCFullYear() + '.'
    + zeroPad(now.getUTCMonth() + 1) + '.'
    + zeroPad(now.getUTCDate()) + '.'
    + `${[now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()].map(v => zeroPad(v)).join('')}ZUTC`
  const reportTitle = `${dateMark} - ${basicTitle}`
}

export { standardTitle }
