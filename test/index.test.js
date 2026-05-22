import { describe, it, expect } from 'vitest';
import detective from '../index.js';

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

describe('detective-typescript', () => {
  it('accepts an AST', () => {
    const deps = detective(ast);
    expect(deps).toHaveLength(0);
  });

  it('retrieves the dependencies of modules', () => {
    const fixture = 'import {foo, bar} from "mylib";';
    const deps = detective(fixture);
    expect(deps).toStrictEqual(['mylib']);
  });

  it('retrieves the re-export dependencies of modules', () => {
    const fixture = 'export {foo, bar} from "mylib";';
    const deps = detective(fixture);
    expect(deps).toStrictEqual(['mylib']);
  });

  it('retrieves the re-export * dependencies of modules', () => {
    const fixture = 'export * from "mylib";';
    const deps = detective(fixture);
    expect(deps).toStrictEqual(['mylib']);
  });

  it('handles multiple imports', () => {
    const fixture = 'import {foo, bar} from "mylib";\nimport "mylib2"';
    const deps = detective(fixture);
    expect(deps).toStrictEqual(['mylib', 'mylib2']);
  });

  it('handles default imports', () => {
    const fixture = 'import foo from "foo";';
    const deps = detective(fixture);
    expect(deps).toStrictEqual(['foo']);
  });

  it('handles dynamic imports', () => {
    const fixture = 'import("foo");';
    const deps = detective(fixture);
    expect(deps).toStrictEqual(['foo']);
  });

  it('handles async imports', () => {
    const fixture = '() => import("foo");';
    const deps = detective(fixture);
    expect(deps).toStrictEqual(['foo']);
  });

  it('skips async imports when using skipAsyncImports', () => {
    const fixture = '() => import("foo");';
    const deps = detective(fixture, { skipAsyncImports: true });
    expect(deps).toHaveLength(0);
  });

  it('retrieves dependencies from modules using "export ="', () => {
    const fixture = 'import foo = require("mylib");';
    const deps = detective(fixture);
    expect(deps).toStrictEqual(['mylib']);
  });

  it('returns an empty list for re-exports without a source', () => {
    const fixture = 'const foo = 1; export { foo };';
    const deps = detective(fixture);
    expect(deps).toHaveLength(0);
  });

  it('returns an empty list for non-modules', () => {
    const fixture = 'var foo = require("foo");';
    const deps = detective(fixture);
    expect(deps).toHaveLength(0);
  });

  it('returns an empty list for empty files', () => {
    const fixture = '';
    const deps = detective(fixture);
    expect(deps).toHaveLength(0);
  });

  it('throws when content is not provided', () => {
    expect(() => {
      detective();
    }).toThrow(new Error('src not given'));
  });

  it('does not throw with angle bracket type assertions in a module', () => {
    expect(() => {
      const fixture = 'import foo from "foo"; var baz = <baz>bar;';
      detective(fixture);
    }).not.toThrow();
  });

  it('parses out type annotation imports', () => {
    const fixture = 'const x: typeof import("foo") = 0;';
    const deps = detective(fixture);
    expect(deps).toStrictEqual(['foo']);
  });

  it('does not count type annotation imports if the skipTypeImports option is enabled', () => {
    const fixture = 'const x: typeof import("foo") = 0;';
    const deps = detective(fixture, { skipTypeImports: true });
    expect(deps).toHaveLength(0);
  });

  it('parses out TypeScript >= 3.8 type imports', () => {
    const fixture = 'import type { Foo } from "foo"';
    const deps = detective(fixture);
    expect(deps).toStrictEqual(['foo']);
  });

  it('does not count TypeScript >= 3.8 type imports if the skipTypeImports option is enabled', () => {
    const fixture = 'import type { Foo } from "foo"';
    const deps = detective(fixture, { skipTypeImports: true });
    expect(deps).toHaveLength(0);
  });

  it('does not count TypeScript named type imports if the skipTypeImports option is enabled', () => {
    const fixture = 'import { type Foo } from "foo"';
    const deps = detective(fixture, { skipTypeImports: true });
    expect(deps).toHaveLength(0);

    // If not all the named imports are type imports, then it still counts as a dep.
    const fixture2 = 'import { type Foo, Bar } from "foo"';
    const deps2 = detective(fixture2, { skipTypeImports: true });
    expect(deps2).toStrictEqual(['foo']);
  });

  it('does not count TypeScript type exports if the skipTypeImports option is enabled', () => {
    const fixture = 'export type { Foo } from "foo"';
    const deps = detective(fixture, { skipTypeImports: true });
    expect(deps).toHaveLength(0);
  });

  it('does not count TypeScript named type exports if the skipTypeImports option is enabled', () => {
    const fixture = 'export { type Foo } from "foo"';
    const deps = detective(fixture, { skipTypeImports: true });
    expect(deps).toHaveLength(0);

    // If not all the named exports are type exports, then it still counts as a dep.
    const fixture2 = 'export { type Foo, Bar } from "foo"';
    const deps2 = detective(fixture2, { skipTypeImports: true });
    expect(deps2).toStrictEqual(['foo']);
  });

  it('supports CJS when mixedImports is true', () => {
    const fixture = 'const foo = require("foobar")';
    const deps = detective(fixture, { mixedImports: true });
    expect(deps).toStrictEqual(['foobar']);
  });

  it('supports CJS template literal require when mixedImports is true', () => {
    const fixture = 'const foo = require(`foobar`)';
    const deps = detective(fixture, { mixedImports: true });
    expect(deps).toStrictEqual(['foobar']);
  });

  it('supports require.main.require when mixedImports is true', () => {
    const fixture = 'const foo = require.main.require("foobar")';
    const deps = detective(fixture, { mixedImports: true });
    expect(deps).toStrictEqual(['foobar']);
  });

  it('calls onFile callback', () => {
    let onFileCalledArgs;
    const onFile = (...args) => {
      onFileCalledArgs = args;
    };

    const fixture = 'import {foo, bar} from "mylib";';

    detective(fixture, { onFile });

    expect(onFileCalledArgs).toHaveLength(1);
    expect(onFileCalledArgs[0].src).toBe(fixture);
    expect(onFileCalledArgs[0].ast).toBeTypeOf('object');
    expect(onFileCalledArgs[0].walker).toBeTypeOf('object');
    expect(onFileCalledArgs[0].options).toBeTypeOf('object');
    expect(onFileCalledArgs[0].options.onFile).toBe(onFile);
  });

  it('calls onAfterFile callback', () => {
    let onAfterFileCalledArgs;
    const onAfterFile = (...args) => {
      onAfterFileCalledArgs = args;
    };

    const fixture = 'import {foo, bar} from "mylib";';

    detective(fixture, { onAfterFile });

    expect(onAfterFileCalledArgs).toHaveLength(1);
    expect(onAfterFileCalledArgs[0].src).toBe(fixture);
    expect(onAfterFileCalledArgs[0].ast).toBeTypeOf('object');
    expect(onAfterFileCalledArgs[0].walker).toBeTypeOf('object');
    expect(onAfterFileCalledArgs[0].dependencies).toBeInstanceOf(Array);
    expect(onAfterFileCalledArgs[0].options).toBeTypeOf('object');
    expect(onAfterFileCalledArgs[0].options.onAfterFile).toBe(onAfterFile);
  });
});

describe('jsx', () => {
  it('throws with JSX in a module when parserOptions.jsx is not set', () => {
    expect(() => {
      const fixture = 'import Foo from "Foo"; var foo = <Foo/>;';
      detective(fixture);
    }).toThrow(/^'>' expected\.$/);
  });

  it('does not throw with JSX in a module and parserOptions.jsx', () => {
    expect(() => {
      const fixture = 'import Foo from "Foo"; var foo = <Foo/>;';
      detective(fixture, { jsx: true });
    }).not.toThrow();
  });
});

describe('tsx', () => {
  it('does not throw when given no options', () => {
    expect(() => {
      const fixture = 'import Foo from "Foo"; var foo = <Foo/>;';
      detective.tsx(fixture);
    }).not.toThrow();
  });

  it('returns the import of a tsx file when using option', () => {
    const fixture = 'import Foo from "Foo"; var foo = <Foo/>;';
    const results = detective(fixture, { jsx: true });
    expect(results).toStrictEqual(['Foo']);
  });

  it('returns the import of a tsx file when using API call', () => {
    const fixture = 'import Foo from "Foo"; var foo = <Foo/>;';
    const results = detective.tsx(fixture);
    expect(results).toStrictEqual(['Foo']);
  });
});
