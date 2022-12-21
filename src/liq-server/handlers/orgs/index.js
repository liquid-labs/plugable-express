import { handlers as projectHandlers } from './projects'
import { handlers as staffHandlers } from './staff'

import * as orgCreate from './create'
import * as orgList from './list'

const handlers = [
	orgCreate,
	orgList,
	...projectHandlers,
	...staffHandlers
]

export { handlers }
