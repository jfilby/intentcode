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
Use the H1 name as the class name (or other name if not a class).

Make use of and adhere to these attributes where relevant:
async, export, generator, static, instance.


## Opinionated and correct coding

Types used by more than one class should be put into their own file.

Classes must be stateless. No mutable fields, cursors, or stored inputs. All
state must be passed explicitly through function arguments and return values.

Do not declare classes inside other classes. All classes must be top-level
exports or top-level declarations.

Instantiate classes before calling their instance functions.

Only use async when awaiting.

