const start = ( { app, options }) => {
  const { PORT, reporter } = options
  const server = app.listen(PORT, (err) => {
    if (err) {
      reporter.error(`Error while starting server.\n${err}`)
      return
    } // else good to go!
    
    reporter.log(`liq server listening on ${PORT}`)
    reporter.log('Press Ctrl+C to quit.')
  })

  // support clean shutdown via sigterm
  process.on('SIGTERM', () => {
    server.close(() => {
      reporter.log('Server shut down.')
    })
  })
  
  return server
}

export { start }
