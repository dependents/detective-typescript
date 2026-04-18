'use strict';

const assert = require('assert').strict;
const { suite } = require('uvu');
const detective = require('../index.js');

const ast = {
  type: 'Program',
  body: [{
    type: 'VariableDeclaration',
    declarations: [{
      type: 'VariableDeclarator',
      id: {
        type: 'Identifier',
        name: 'x'
      },
      init: {
        type: 'Literal',
        value: 4,
        raw: '4'
      }
    }],
    kind: 'let'
  }]
};

const test = suite('detective-typescript');

test('accepts an ast', () => {
  const deps = detective(ast);
  assert.equal(deps.length, 0);
});

test('retrieves the dependencies of modules', () => {
  const fixture = 'import {foo, bar} from "mylib";';
  const deps = detective(fixture);
  assert.equal(deps.length, 1);
  assert.equal(deps[0], 'mylib');
});

test('retrieves the re-export dependencies of modules', () => {
  const fixture = 'export {foo, bar} from "mylib";';
  const deps = detective(fixture);
  assert.equal(deps.length, 1);
  assert.equal(deps[0], 'mylib');
});

test('retrieves the re-export * dependencies of modules', () => {
  const fixture = 'export * from "mylib";';
  const deps = detective(fixture);
  assert.equal(deps.length, 1);
  assert.equal(deps[0], 'mylib');
});

test('handles multiple imports', () => {
  const fixture = 'import {foo, bar} from "mylib";\nimport "mylib2"';
  const deps = detective(fixture);
  assert.equal(deps.length, 2);
  assert.equal(deps[0], 'mylib');
  assert.equal(deps[1], 'mylib2');
});

test('handles default imports', () => {
  const fixture = 'import foo from "foo";';
  const deps = detective(fixture);
  assert.equal(deps.length, 1);
  assert.equal(deps[0], 'foo');
});

test('handles dynamic imports', () => {
  const fixture = 'import("foo");';
  const deps = detective(fixture);
  assert.equal(deps.length, 1);
  assert.equal(deps[0], 'foo');
});

test('handles async imports', () => {
  const fixture = '() => import("foo");';
  const deps = detective(fixture);
  assert.equal(deps.length, 1);
  assert.equal(deps[0], 'foo');
});

test('skips async imports when using skipAsyncImports', () => {
  const fixture = '() => import("foo");';
  const deps = detective(fixture, { skipAsyncImports: true });
  assert.equal(deps.length, 0);
});

test('retrieves dependencies from modules using "export ="', () => {
  const fixture = 'import foo = require("mylib");';
  const deps = detective(fixture);
  assert.equal(deps.length, 1);
  assert.equal(deps[0], 'mylib');
});

test('returns an empty list for non modules', () => {
  const fixture = 'var foo = require("foo");';
  const deps = detective(fixture);
  assert.equal(deps.length, 0);
});

test('returns an empty list for empty files', () => {
  const fixture = '';
  const deps = detective(fixture);
  assert.equal(deps.length, 0);
});

test('throws when content is not provided', () => {
  assert.throws(() => {
    detective();
  }, /^Error: src not given$/);
});

test('does not throw with angle bracket type assertions in a module', () => {
  assert.doesNotThrow(() => {
    const fixture = 'import foo from "foo"; var baz = <baz>bar;';
    detective(fixture);
  });
});

test('parses out type annotation imports', () => {
  const fixture = 'const x: typeof import("foo") = 0;';
  const deps = detective(fixture);
  assert.equal(deps.length, 1);
  assert.equal(deps[0], 'foo');
});

test('does not count type annotation imports if the skipTypeImports option is enabled', () => {
  const fixture = 'const x: typeof import("foo") = 0;';
  const deps = detective(fixture, { skipTypeImports: true });
  assert.equal(deps.length, 0);
});

test('parses out TypeScript >= 3.8 type imports', () => {
  const fixture = 'import type { Foo } from "foo"';
  const deps = detective(fixture);
  assert.equal(deps.length, 1);
  assert.equal(deps[0], 'foo');
});

test('does not count TypeScript >= 3.8 type imports if the skipTypeImports option is enabled', () => {
  const fixture = 'import type { Foo } from "foo"';
  const deps = detective(fixture, { skipTypeImports: true });
  assert.equal(deps.length, 0);
});

test('does not count TypeScript named type imports if the skipTypeImports option is enabled', () => {
  const fixture = 'import { type Foo } from "foo"';
  const deps = detective(fixture, { skipTypeImports: true });
  assert.equal(deps.length, 0);

  // If not all the named imports are type imports, then it still counts as a dep.
  const fixture2 = 'import { type Foo, Bar } from "foo"';
  const deps2 = detective(fixture2, { skipTypeImports: true });
  assert.equal(deps2.length, 1);
  assert.equal(deps2[0], 'foo');
});

test('does not count TypeScript type exports if the skipTypeImports option is enabled', () => {
  const fixture = 'export type { Foo } from "foo"';
  const deps = detective(fixture, { skipTypeImports: true });
  assert.equal(deps.length, 0);
});

test('does not count TypeScript named exports if the skipTypeImports option is enabled', () => {
  const fixture = 'export { type Foo } from "foo"';
  const deps = detective(fixture, { skipTypeImports: true });
  assert.equal(deps.length, 0);

  // If not all the named exports are type exports, then it still counts as a dep.
  const fixture2 = 'export { type Foo, Bar } from "foo"';
  const deps2 = detective(fixture2, { skipTypeImports: true });
  assert.equal(deps2.length, 1);
  assert.equal(deps2[0], 'foo');
});

test('supports CJS when mixedImports is true', () => {
  const fixture = 'const foo = require("foobar")';
  const deps = detective(fixture, { mixedImports: true });
  assert.equal(deps.length, 1);
  assert.equal(deps[0], 'foobar');
});

test('calls onFile callback', () => {
  let onFileCalledArgs;
  const onFile = (...args) => {
    onFileCalledArgs = args;
  };

  const fixture = 'import {foo, bar} from "mylib";';

  detective(fixture, { onFile });

  assert.ok(onFileCalledArgs);
  assert.ok(onFileCalledArgs[0]);
  assert.equal(onFileCalledArgs[0].src, fixture);
  assert.equal(typeof onFileCalledArgs[0].ast, 'object');
  assert.equal(typeof onFileCalledArgs[0].walker, 'object');
  assert.equal(typeof onFileCalledArgs[0].options, 'object');
  assert.equal(onFileCalledArgs[0].options.onFile, onFile);
});

test('calls onAfterFile callback', () => {
  let onAfterFileCalledArgs;
  const onAfterFile = (...args) => {
    onAfterFileCalledArgs = args;
  };

  const fixture = 'import {foo, bar} from "mylib";';

  detective(fixture, { onAfterFile });

  assert.ok(onAfterFileCalledArgs);
  assert.ok(onAfterFileCalledArgs[0]);
  assert.equal(onAfterFileCalledArgs[0].src, fixture);
  assert.equal(typeof onAfterFileCalledArgs[0].ast, 'object');
  assert.equal(typeof onAfterFileCalledArgs[0].walker, 'object');
  assert.equal(Array.isArray(onAfterFileCalledArgs[0].dependencies), true);
  assert.equal(typeof onAfterFileCalledArgs[0].options, 'object');
  assert.equal(onAfterFileCalledArgs[0].options.onAfterFile, onAfterFile);
});

test.run();

const jsx = suite('jsx');

jsx('throws with JSX in a module and !parserOptions.jsx', () => {
  assert.throws(() => {
    const fixture = 'import Foo from "Foo"; var foo = <Foo/>;';
    detective(fixture);
  }, /^TSError: '>' expected.$/);
});

jsx('does not throw with JSX in a module and parserOptions.jsx', () => {
  assert.doesNotThrow(() => {
    const fixture = 'import Foo from "Foo"; var foo = <Foo/>;';
    detective(fixture, { jsx: true });
  });
});

jsx.run();

const tsx = suite('tsx');

tsx('does not throw when given no options', () => {
  assert.doesNotThrow(() => {
    const fixture = 'import Foo from "Foo"; var foo = <Foo/>;';
    detective.tsx(fixture);
  });
});

tsx('returns the import of a tsx file when using option', () => {
  const fixture = 'import Foo from "Foo"; var foo = <Foo/>;';
  const results = detective(fixture, { jsx: true });
  assert.equal(results[0], 'Foo');
});

tsx('returns the import of a tsx file when using API call', () => {
  const fixture = 'import Foo from "Foo"; var foo = <Foo/>;';
  const results = detective.tsx(fixture);
  assert.equal(results[0], 'Foo');
});

tsx.run();
