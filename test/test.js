/* eslint-env mocha */
'use strict';

const assert = require('assert');
const detective = require('../');

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
    assert(!deps.length);
  });

  it('retrieves the dependencies of modules', () => {
    const deps = detective('import {foo, bar} from "mylib";');
    assert(deps.length === 1);
    assert(deps[0] === 'mylib');
  });

  it('retrieves the re-export dependencies of modules', () => {
    const deps = detective('export {foo, bar} from "mylib";');
    assert(deps.length === 1);
    assert(deps[0] === 'mylib');
  });

  it('retrieves the re-export * dependencies of modules', () => {
    const deps = detective('export * from "mylib";');
    assert(deps.length === 1);
    assert(deps[0] === 'mylib');
  });

  it('handles multiple imports', () => {
    const deps = detective('import {foo, bar} from "mylib";\nimport "mylib2"');
    assert(deps.length === 2);
    assert(deps[0] === 'mylib');
    assert(deps[1] === 'mylib2');
  });

  it('handles default imports', () => {
    const deps = detective('import foo from "foo";');
    assert(deps.length === 1);
    assert(deps[0] === 'foo');
  });

  it('handles dynamic imports', () => {
    const deps = detective('import("foo");');
    assert(deps.length === 1);
    assert(deps[0] === 'foo');
  });

  it('retrieves dependencies from modules using "export ="', () => {
    const deps = detective('import foo = require("mylib");');
    assert(deps.length === 1);
    assert(deps[0] === 'mylib');
  });

  it('returns an empty list for non modules', () => {
    const deps = detective('var foo = require("foo");');
    assert(!deps.length);
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

    it('returns the import of a tsx file', () => {
      const results = detective.tsx(`import Foo from 'Foo'; var foo = <Foo/>`, { jsx: true });
      assert.equal(results[0], 'Foo');
    });
  });

  it('parses out type annotation imports', () => {
    const deps = detective('const x: typeof import("foo") = 0;');
    assert(deps.length === 1);
    assert(deps[0] === 'foo');
  });

  it('does not count type annotation imports if the skipTypeImports option is enabled', () => {
    const deps = detective('const x: typeof import("foo") = 0;', {skipTypeImports: true});
    assert(deps.length === 0);
  });

  it('parses out TypeScript >=3.8 type imports', () => {
    const deps = detective('import type { Foo } from "foo"');
    assert(deps.length === 1);
    assert(deps[0] === 'foo');
  })

  it('does not count TypeScript >=3.8 type imports if the skipTypeImports option is enabled', () => {
    const deps = detective('import type { Foo } from "foo"', {skipTypeImports: true});
    assert(deps.length === 0);
  });

  it('supports CJS when mixedImports is true', () => {
    const deps = detective('const foo = require("foobar")', { mixedImports: true });
    assert(deps.length === 1);
    assert(deps[0] === 'foobar');
  })

  it('does not count dynamic imports if module name is string-interpolated', () => {
    const deps = detective('const filename = "ts.svg"; import(`./${filename}`);');
    assert(deps.length === 0);
  })
});
