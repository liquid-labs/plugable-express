import { handlers as projectHandlers } from './projects'
import { handlers as staffHandlers } from './staff'

import * as orgCreate from './create'
import * as orgList from './list'
import * as paramList from './parameters-list'

const handlers = [
	orgCreate,
	orgList,
	paramList,
	...projectHandlers,
	...staffHandlers
]

export { handlers }
