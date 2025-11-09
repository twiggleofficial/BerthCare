'use strict';

/**
 * Minimal shim so Metro can parse `import.meta` references that sneak in from shared code.
 * Maps `import.meta.env` -> `process.env` and leaves other properties undefined.
 */
module.exports = function importMetaShim({ types: t }) {
  return {
    name: 'import-meta-shim',
    visitor: {
      MetaProperty(path) {
        const { node } = path;
        if (
          node.meta &&
          node.meta.name === 'import' &&
          node.property &&
          node.property.name === 'meta'
        ) {
          path.replaceWith(
            t.objectExpression([
              t.objectProperty(
                t.identifier('env'),
                t.memberExpression(t.identifier('process'), t.identifier('env'))
              ),
            ])
          );
        }
      },
    },
  };
};
