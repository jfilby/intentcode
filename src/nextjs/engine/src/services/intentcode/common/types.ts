export class IntentCodeCommonTypes {

  static intentCodePrompting =
    `IntentCode:\n` +
    `- Is pseudo-code, don't interpret it as literal code.\n` +
    `- Has a focus on intent and doesn't include programming details.\n` +
    `- Uses Markdown format to reflect high-level code structure.\n` +
    `- Isn't overcomplicated or overly detailed with anything that an LLM ` +
    `  could infer.\n` +
    `- Prefer referencing algorithms and approaches only, unless there's a ` +
    `  good reason to describe the details.\n`
}
