### detective-typescript [![Build Status](http://img.shields.io/travis/pahen/detective-typescript/master.svg?style=flat-square)](https://travis-ci.org/pahen/detective-typescript) [![npm](http://img.shields.io/npm/v/detective-typescript.svg)](https://npmjs.org/package/detective-typescript) [![npm](http://img.shields.io/npm/dm/detective-typescript.svg)](https://npmjs.org/package/detective-typescript)

> Get the dependencies of TypeScript module

`npm install detective-typescript`

### Usage

```js
var detective = require('detective-typescript');
var mySourceCode = fs.readFileSync('myfile.ts', 'utf8');

// Pass in a file's content or an AST
var dependencies = detective(mySourceCode);
```

### Options

- `skipTypeImports` (default: false) Skips imports that only imports types
- `mixedImports`: (default: false) Include CJS imports in dependency list
- `skipAsyncImports`: (default: false) Whether or not to omit async imports (import('foo'))
- `jsx`: (default: false) Enable parsing of JSX

#### License

MIT
