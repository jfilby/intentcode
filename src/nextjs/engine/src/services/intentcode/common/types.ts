export class IntentCodeCommonTypes {

  static intentCodePrompting =
    `IntentCode:\n` +
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
    `Example IntentCode, for style ref only (wrapped in a Markdown block):\n` +
    `\n` +
    '```md\n' +
    `# My parser (class)\n` +
    `\n` +
    `## test (fn)\n` +
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
    `## validate (fn)\n` +
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
}
