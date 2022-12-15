import { handlers as projectHandlers } from './projects'
import { handlers as staffHandlers } from './staff'

import * as orgList from './list'

const handlers = [
	orgList,
	...projectHandlers,
	...staffHandlers
]

export { handlers }
