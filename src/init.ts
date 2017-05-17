import { join } from 'path'
import * as glob from 'glob-promise'

import { N9Micro } from './index'

export default async function({ path, log }: N9Micro.Options, { app, server }) {
	const initFiles = await glob('**/*.init.+(ts|js)', { cwd: path })
	await Promise.all(initFiles.map((file) => {
		const moduleName = file.split('/').slice(-2)[0]
		log.info(`Init module ${moduleName}`)
		let module = require(join(path, file))
		module = module.default ? module.default : module
		return module({ log, app, server })
	}))
}
