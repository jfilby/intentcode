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

Markdown headings should specify a type as a prefix, e.g. class: or fn:. But
only function is abbreviated to fn, no other type.

Make use of and adhere to these attributes where relevant:
async, export, generator, static, instance.


## Opinionated coding

Use kebab-case for TypeScript/JavaScript filenames, e.g. my-test.ts. This also
goes for IntentCode markdown filenames for TypeScript/JavaScript filenames.

Types used by more than one class should be put into their own file.

Classes must be stateless. No mutable fields, cursors, or stored inputs. All
state must be passed explicitly through function arguments and return values.


## Avoid errors

Do not declare classes inside other classes. All classes must be top-level
exports or top-level declarations.

Instantiate classes before calling their instance functions.

Only use async when awaiting.

