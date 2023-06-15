const method = 'get'
const path = '/tasks/:threadId'

const parameters = [
  {
    name        : 'peek',
    required    : false,
    isBoolean   : true,
    description : "Does not 'acknowledge' the task result, but just takes a peek."
  }
]

const func = ({ app }) => (req, res) => {
  const { threadId } = req.params
  const { peek } = req.query

  const taskData = app.tasks.get(threadId)

  if (taskData === undefined) {
    res.status(404).json({ message : `No such task for '${threadId}' found. Check your reference, or it may have already been handled.` })
    return
  }

  if (!peek && taskData.running === false) {
    taskData.acknowledged = true
    app.tasks.remove(threadId)
  }

  res.json(taskData)
}

export { func, parameters, path, method }
