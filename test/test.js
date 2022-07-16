/* eslint-env mocha */

'use strict';

const assert = require('assert').strict;
const detective = require('../index.js');

describe('detective-typescript', () => {
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

  it('accepts an ast', () => {
    const deps = detective(ast);
    assert.equal(deps.length, 0);
  });

  it('handles imports without identifiers', () => {
    const deps = detective('import "mylib";');
    assert.equal(deps.length, 1);
    assert.equal(deps[0], 'mylib');
  });


  it('handles imports without identifiers', () => {
    const deps = detective('import "mylib";', {
      identifiers: true
    });
    assert.equal(deps.length, 1);
    assert.deepEqual(deps[0], { path: 'mylib', identifiers: [] });
  });

  it('retrieves the dependencies of modules', () => {
    const deps = detective('import {foo, bar} from "mylib";');
    assert.equal(deps.length, 1);
    assert.equal(deps[0], 'mylib');
  });

  it('retrieves the dependencies of modules with identifiers', () => {
    const deps = detective('import {foo, bar} from "mylib";', {
      identifiers: true
    });
    assert.equal(deps.length, 1);
    assert.deepEqual(deps[0], { path: 'mylib', identifiers: ['foo', 'bar'] });
  });

  it('retrieves the re-export dependencies of modules', () => {
    const deps = detective('export {foo, bar} from "mylib";');
    assert.equal(deps.length, 1);
    assert.equal(deps[0], 'mylib');
  });

  it('retrieves the re-export dependencies of modules with identifiers', () => {
    const deps = detective('export {foo, bar} from "mylib";', {
      identifiers: true
    });
    assert.equal(deps.length, 1);
    assert.deepEqual(deps[0], { path: 'mylib', identifiers: ['foo', 'bar'] });
  });

  it('retrieves the re-export * dependencies of modules', () => {
    const deps = detective('export * from "mylib";');
    assert.equal(deps.length, 1);
    assert.equal(deps[0], 'mylib');
  });

  it('retrieves the re-export * dependencies of modules with identifiers', () => {
    const deps = detective('export * from "mylib";', {
      identifiers: true
    });
    assert.equal(deps.length, 1);
    assert.deepEqual(deps[0], { path: 'mylib', identifiers: ['*'] });
  });

  it('handles multiple imports', () => {
    const deps = detective('import {foo, bar} from "mylib";\nimport "mylib2"');
    assert.equal(deps.length,  2);
    assert.equal(deps[0], 'mylib');
    assert.equal(deps[1], 'mylib2');
  });

  it('handles default imports', () => {
    const deps = detective('import foo from "foo";');
    assert.equal(deps.length, 1);
    assert.equal(deps[0], 'foo');
  });

  it('handles default imports with identifiers', () => {
    const deps = detective('import foo from "foo";', {
      identifiers: true
    });
    assert.equal(deps.length, 1);
    assert.deepEqual(deps[0], { path: 'foo', identifiers: ['default'] });
  });

  it('handles dynamic imports', () => {
    const deps = detective('import("foo");');
    assert.equal(deps.length, 1);
    assert.equal(deps[0], 'foo');
  });

  it('handles dynamic imports with identifiers', () => {
    const deps = detective('import("foo");', {
      identifiers: true
    });
    assert.equal(deps.length, 1);
    assert.deepEqual(deps[0], { path: 'foo', identifiers: ['*'] });
  });

  it('handles async imports', () => {
    const deps = detective('() => import("foo");');
    assert.equal(deps.length, 1);
    assert.equal(deps[0], 'foo');
  });

  it('handles async imports with identifiers', () => {
    const deps = detective('import("foo");', {
      identifiers: true
    });
    assert.equal(deps.length, 1);
    assert.deepEqual(deps[0], { path: 'foo', identifiers: ['*'] });
  });

  it('skips async imports when using skipAsyncImports', () => {
    const deps = detective('() => import("foo");', { skipAsyncImports: true });
    assert.equal(deps.length,  0);
  });

  it('retrieves dependencies from modules using "export ="', () => {
    const deps = detective('import foo = require("mylib");');
    assert.equal(deps.length, 1);
    assert.equal(deps[0], 'mylib');
  });

  it('returns an empty list for non modules', () => {
    const deps = detective('var foo = require("foo");');
    assert.equal(deps.length, 0);
  });

  it('returns an empty list for empty files', () => {
    const deps = detective('');
    assert.equal(deps.length, 0);
  });

  it('throws when content is not provided', () => {
    assert.throws(() => {
      detective();
    }, Error, 'src not given');
  });

  it('does not throw with angle bracket type assertions in a module', () => {
    assert.doesNotThrow(() => {
      detective(`import foo from 'foo'; var baz = <baz>bar;`);
    });
  });

  it('throws with JSX in a module and !parserOptions.jsx', () => {
    assert.throws(() => {
      detective(`import Foo from 'Foo'; var foo = <Foo/>`);
    });
  });

  it('does not throw with JSX in a module and parserOptions.jsx', () => {
    assert.doesNotThrow(() => {
      detective(`import Foo from 'Foo'; var foo = <Foo/>`, { jsx: true });
    });
  });

  describe('tsx', () => {
    it('does not throw when given no options', () => {
      assert.doesNotThrow(() => {
        detective.tsx(`import Foo from 'Foo'; var foo = <Foo/>`);
      });
    });

    it('returns the import of a tsx file when using option', () => {
      const results = detective(`import Foo from 'Foo'; var foo = <Foo/>`, { jsx: true });
      assert.equal(results[0], 'Foo');
    });

    it('returns the import of a tsx file when using API call', () => {
      const results = detective.tsx(`import Foo from 'Foo'; var foo = <Foo/>`);
      assert.equal(results[0], 'Foo');
    });
  });

  it('parses out type annotation imports', () => {
    const deps = detective('const x: typeof import("foo") = 0;');
    assert.equal(deps.length, 1);
    assert.equal(deps[0], 'foo');
  });

  it('parses out type annotation imports with identifiers', () => {
    const deps = detective('const x: typeof import("foo") = 0;', {
      identifiers: true
    });
    assert.equal(deps.length, 1);
    assert.deepEqual(deps[0], { path: 'foo', identifiers: ['*'] });
  });

  it('does not count type annotation imports if the skipTypeImports option is enabled', () => {
    const deps = detective('const x: typeof import("foo") = 0;', {skipTypeImports: true});
    assert.equal(deps.length,  0);
  });

  it('parses out TypeScript >=3.8 type imports', () => {
    const deps = detective('import type { Foo } from "foo"');
    assert.equal(deps.length, 1);
    assert.equal(deps[0], 'foo');
  });

  it('parses out TypeScript >=3.8 type imports with identifiers', () => {
    const deps = detective('import type { Foo } from "foo"', {
      identifiers: true
    });
    assert.equal(deps.length, 1);
    assert.deepEqual(deps[0], { path: 'foo', identifiers: ['Foo'] });
  });

  it('does not count TypeScript >=3.8 type imports if the skipTypeImports option is enabled', () => {
    const deps = detective('import type { Foo } from "foo"', {skipTypeImports: true});
    assert.equal(deps.length,  0);
  });

  it('supports CJS when mixedImports is true', () => {
    const deps = detective('const foo = require("foobar")', { mixedImports: true });
    assert.equal(deps.length, 1);
    assert.equal(deps[0], 'foobar');
  });

  it('supports CJS when mixedImports is true with identifiers', () => {
    const deps = detective('const foo = require("foobar")', {
      mixedImports: true,
      identifiers: true
    });
    assert.equal(deps.length, 1);
    assert.deepEqual(deps[0], { path: 'foobar', identifiers: ['*'] });
  });
});
