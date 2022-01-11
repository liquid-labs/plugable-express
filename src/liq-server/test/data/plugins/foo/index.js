const fooOutput = 'I am foo'

const fooHandler = {
  method: 'get',
  path: '/foo',
  func: () => (req, res) => {
    res.json(fooOutput)
  }
}

const handlers = [ fooHandler ]

export { handlers, fooOutput }
