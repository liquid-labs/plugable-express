import * as fs from 'node:fs'

import { readFJSON, writeFJSON } from '@liquid-labs/federated-json'


const loadDb = ({ cache, cacheKey, path }) => {
	let db = cache?.get(cacheKey)
	if (!db) { // load the DB from path
		db = readFJSON(path)
		cache.put(cacheKey, db)
	}
	return db
}

