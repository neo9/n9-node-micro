import { join } from 'path'
import n9Micro from './src'

n9Micro({
	path: join(__dirname, 'test/fixtures/micro-foo/'),
	http: {
		port: 8000
	}
})
