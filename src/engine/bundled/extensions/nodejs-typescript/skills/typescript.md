---
name: Bundled TypeScript
description: TypeScript skill

context:
  anyDependency:
    - name: typescript
      minVersion: 5
  fileExts: .ts, .tsx
---

# Bundled TypeScript

## General instructions

Each file should have a single general purpose.
Wrap functions and methods in a class where there are many of them in a file.

Make use of and adhere to these attributes in the code where relevant:
async, export, generator, static, instance.


## Opinionated coding

Use kebab-case for TypeScript/JavaScript filenames, e.g. index.ts or
my-test.ts. This also goes for IntentCode markdown filenames for TypeScript/
JavaScript filenames.

Types used by more than one class should be put into their own file.

Classes must be stateless. No mutable fields, cursors, or stored inputs. All
state must be passed explicitly through function arguments and return values.


## Imports

Imports can be 3rd party libraries or a relative path to another IntentCode
file (even from another project using an @). An example of all three:

import:
- lodash
- ../helpers/parser.ts.md
- @docs/help.ts.md


## Error handling

- User-facing errors: propagate up so they can be handled/displayed.
- Internal errors: throw an exception to indicate a bug or unexpected state.

Only add custom error handling in IntentCode if it falls outside of these
defaults.


## Avoid errors

Do not declare classes inside other classes. All classes must be top-level
exports or top-level declarations.

Instantiate classes before calling their instance functions.

Only use async when awaiting.

