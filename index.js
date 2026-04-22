'use strict';

const parser = require('@typescript-eslint/typescript-estree');
const types = require('ast-module-types');
const Walker = require('node-source-walk');

/**
 * Extracts the dependencies of the supplied TypeScript module
 *
 * @param  {String|Object} src - File's content or AST
 * @return {String[]}
 */
module.exports = (src, options = {}) => {
  if (src === undefined) throw new Error('src not given');
  if (src === '') return [];

  // Destructure detective-specific options; the rest are forwarded to the walker/parser.
  const {
    // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-9.html#import-types
    // https://www.typescriptlang.org/v2/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export
    skipTypeImports: skipTypeImportsRaw,
    mixedImports: mixedImportsRaw,
    skipAsyncImports,
    onFile,
    onAfterFile,
    ...walkerOptions
  } = options;

  const skipTypeImports = Boolean(skipTypeImportsRaw);
  const mixedImports = Boolean(mixedImportsRaw);
  walkerOptions.parser = parser;

  const walker = new Walker(walkerOptions);
  const dependencies = [];

  // Pre-parse the source to get the AST to pass to `onFile`,
  // then reuse that AST below in our walker walk.
  const ast = typeof src === 'string' ? walker.parse(src) : src;

  if (onFile) {
    onFile({
      options,
      src,
      ast,
      walker
    });
  }

  walker.walk(ast, node => {
    switch (node.type) {
      case 'ImportExpression': {
        if (!skipAsyncImports && node.source?.value) {
          dependencies.push(node.source.value);
        }

        break;
      }

      case 'ImportDeclaration': {
        if (skipTypeImports && isTypeImports(node)) {
          break;
        }

        if (node.source?.value) {
          dependencies.push(node.source.value);
        }

        break;
      }

      case 'ExportNamedDeclaration':
      case 'ExportAllDeclaration': {
        if (skipTypeImports && isTypeExports(node)) {
          break;
        }

        if (node.source?.value) {
          dependencies.push(node.source.value);
        }

        break;
      }

      case 'TSExternalModuleReference': {
        if (node.expression?.value) {
          dependencies.push(node.expression.value);
        }

        break;
      }

      case 'TSImportType': {
        if (!skipTypeImports && node.argument.type === 'TSLiteralType') {
          dependencies.push(node.argument.literal.value);
        }

        break;
      }

      case 'CallExpression': {
        const dep = handleCallExpression(node, mixedImports);
        if (dep) dependencies.push(dep);
        break;
      }

      default:
        // nothing
    }
  });

  if (onAfterFile) {
    onAfterFile({
      options,
      src,
      ast,
      walker,
      dependencies
    });
  }

  return dependencies;
};

module.exports.tsx = (src, options = {}) => {
  return module.exports(src, { ...options, jsx: true });
};

function extractDependencyFromRequire(node) {
  if (['Literal', 'StringLiteral'].includes(node.arguments[0].type)) {
    return node.arguments[0].value;
  }

  if (node.arguments[0].type === 'TemplateLiteral') {
    return node.arguments[0].quasis[0].value.raw;
  }
}

function extractDependencyFromMainRequire(node) {
  return node.arguments[0].value;
}

function isTypeImports(node) {
  if (node.importKind === 'type') {
    return true;
  }

  if (node.specifiers?.length && node.specifiers.every(n => n.importKind === 'type')) {
    return true;
  }
}

function handleCallExpression(node, mixedImports) {
  if (!mixedImports || !types.isRequire(node) || !node.arguments || node.arguments.length === 0) {
    return;
  }

  if (types.isPlainRequire(node)) {
    return extractDependencyFromRequire(node);
  }

  if (types.isMainScopedRequire(node)) {
    return extractDependencyFromMainRequire(node);
  }
}

function isTypeExports(node) {
  if (node.exportKind === 'type') {
    return true;
  }

  if (node.specifiers?.length && node.specifiers.every(n => n.exportKind === 'type')) {
    return true;
  }
}
