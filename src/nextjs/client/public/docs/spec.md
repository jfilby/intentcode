# Introduction

IntentCode is both the name of this product, and also a formalized form of
Markdown used to write pseudo-code. This spec broadly covers the product, with
a section on the IntentCode format as well.


## Layers

Specs: high-level specifications (optional)

IntentCode: pseudo-code (standardized)

Source: code


## Specs

While the specs are optional, it can be useful to include at least two files:
- overview.md: the main goal of the codebase
- tech-stack.md: the tech stack, including frameworks and libraries

Note that tech-stack.md is a special file and must be named exactly like that.


## IntentCode

IntentCode is meant to specify the intent of code and not its implementation
details. It should be brief and to the point. However this doesn't exclude
adding implementation details that could be helpful to the reader or the
compiler.

Markdown headings are used to denote entities, e.g. classes, functions and
types. After the name of the entity specify its types (and any other
attributes) in parentheses. E.g.: `# My parser (class)` and
`## test (function)`.

Parameters can then be specified in a block following the heading, e.g.:

```md
## test (function)

Parameters:
- str (string)

Returns: string
```


## Function calling

Example:

```ts
str = read from console(prompt = `> `)

results = Calc.run(input = str)

if results has answer:
  print results.answer
```

