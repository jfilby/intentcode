---
name: Bundled TypeScript
description: TypeScript skill

context:
  file-exts: .ts, .tsx
---

# Bundled TypeScript

## General instructions

Wrap functions and basic types in a class where possible. Use the H1 name as
the class name.

Make use of and adhere to these attributes where relevant:
async, export, generator, static.


## Opinionated and correct coding

Don't use hidden state in classes, rather pass parameters.
Instantiate classes before calling their non-static functions.

