# detective-typescript

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/detective-typescript/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/detective-typescript/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/detective-typescript?logo=npm&logoColor=fff)](https://www.npmjs.com/package/detective-typescript)
[![npm downloads](https://img.shields.io/npm/dm/detective-typescript)](https://www.npmjs.com/package/detective-typescript)

> Get the dependencies of TypeScript module

```sh
npm install detective-typescript typescript
```

## Usage

```js
const fs = require('fs');
const detective = require('detective-typescript');

const mySourceCode = fs.readFileSync('myfile.ts', 'utf8');

// Pass in a file's content or an AST
const dependencies = detective(mySourceCode);

// For TSX/JSX files
const tsxDependencies = detective.tsx(mySourceCode);
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `skipTypeImports` | `boolean` | `false` | Skip imports that only import types |
| `mixedImports` | `boolean` | `false` | Include CJS `require()` calls in the dependency list |
| `skipAsyncImports` | `boolean` | `false` | Omit dynamic `import('foo')` expressions |
| `jsx` | `boolean` | `false` | Enable parsing of JSX/TSX syntax |
| `onFile` | `Function` | - | Callback invoked before a file is processed. Receives `{ options, src, ast, walker }`. Intended for use with [`dependency-tree`](https://github.com/dependents/node-dependency-tree) and [`precinct`](https://github.com/dependents/node-precinct). |
| `onAfterFile` | `Function` | - | Like `onFile`, but also receives `dependencies` (string array of extracted dependencies). |

## License

[MIT](LICENSE)
