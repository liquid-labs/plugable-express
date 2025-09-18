/**
 * Lists the installed plugins.
 *
 * @param {Object} options
 * @param {Object} options.app - The Express app object
 * @returns {Array} Array of installed plugin objects
 */
const listPlugins = ({ app }) => {
  return app.ext.handlerPlugins || []
}

export { listPlugins }
