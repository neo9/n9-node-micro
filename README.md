# n9-node-micro

Neo9 microservice module: init every module, create the express server, add the required routes (/, /ping & /routes) & module routes.

## Installation

```bash
npm install --save n9-node-micro
```

## Usage

`n9Micro([options])`

Options:

- path: `String`, default: `'./modules/'`
- log: `Function`, default: `global.log`, need to be a [N9Log](http://scm.bytefactory.fr/projects/N9NODE/repos/n9-node-log/browse) instance. If no one is found, will use debug.


## Example

```bash
modules/
  users/
    users.init.ts
    users.routes.ts
server.ts
```

`server.ts`

```ts
import N9Log from 'n9-node-log'
import n9Micro from 'n9-node-micro'

(async () => {
  await n9Micro({ log: new N9Log('my-app') })
})()
```

## Logs

To display the logs of the module if no log exists (`global.log` or `log` option), use `DEBUG=n9-node-micro`.
