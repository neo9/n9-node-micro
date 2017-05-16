import { join } from 'path'
import * as glob from 'glob-promise'

import { N9MicroOptions } from './index.d'

export default async function({ path, log }: N9MicroOptions, context?) {
	const initFiles = await glob('**/*.init.+(ts|js)', { cwd: path })
	await Promise.all(initFiles.map((file) => {
		log.info(`Init module ${file.split('/')[0]}`)
		const module = require(join(path, file))
		return module.default ? module.default(context) : module(context)
	}))
}
