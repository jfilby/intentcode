import { FileOps } from '@/types/server-only-types'

export class IntentCodeCommonTypes {

  static intentCodePrompting =
    `IntentCode:\n` +
    // Approach
    `- Is pseudo-code, don't interpret it as literal code.\n` +
    `- Has a focus on intent and doesn't include programming details.\n` +
    `- Uses Markdown format to reflect high-level code structure.\n` +
    `- Markdown headings should specify a type, and optionally other ` +
    `  attributes such as async, in parentheses after the name.\n` +
    `- Isn't overcomplicated or overly detailed with anything that an LLM ` +
    `  could infer.\n` +
    `- Prefer referencing algorithms and approaches only, unless there's a ` +
    `  good reason to describe the details.\n` +
    `\n` +
    // Imports
    `- Imports are only for when entities are needed from another file and ` +
    `  referenced in the imported IntentCode file.\n` +
    `- Avoid circular imports, that would be an error.\n` +
    `- Imports are of other IntentCode files (without more detail).` +
    `\n` +
    // Example
    `Example IntentCode, for style ref only (wrapped in a Markdown block):\n` +
    `\n` +
    '```md\n' +
    `# My parser (class)\n` +
    `\n` +
    `Imports:\n` +
    `- ./utils/parsing\n` +
    `\n` +
    `## test (function)\n` +
    `\n` +
    `parameters:\n` +
    `- str (string)\n` +
    `- validate (boolean)\n` +
    `\n` +
    `return type: boolean\n` +
    `\n` +
    `- if validate is true call validate(str)\n` +
    `\n` +
    `\n` +
    `## validate (function)\n` +
    `\n` +
    `parameters:\n` +
    `- str (string)\n` +
    `\n` +
    `return type: boolean\n` +
    `\n` +
    `- parse str as a number\n` +
    `  - fails to parse, return false\n` +
    `- return true\n` +
    `\n` +
    '```\n' +
    `\n`

  static intentCodeFileDeltasPrompting =
    `- The relativePath must include the source extension, e.g. if ` +
    `  a TypeScript file an example is: /src/index.ts.md.` +
    `- Field fileOp can be ${FileOps.set} or ${FileOps.del}.\n` +
    `- Don't specify the content field if fileOp is ${FileOps.del}.\n` +
    `- Don't include a ${FileOps.del} fileOp for a file also ` +
    `  included as ${FileOps.set}.\n`
}
