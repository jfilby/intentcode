export class TextService {

  // Consts
  clName = 'TextService'

  // Code

  // The model wraps generated source in a markdown fence, or wraps it in
  // prose. Strip the fences when they are there, and otherwise hand the reply
  // back untouched: this text is written to a source file, so guessing at its
  // structure can only ever lose code.
  extractCode(text: string): string {

    // Debug
    const fnName = `${this.clName}.extractCode()`

    // Collect the contents of every fenced block
    const lines = text.split('\n')
    const codeBlocks: string[] = []
    var codeLines: string[] = []
    var inCodeBlock = false

    for (const line of lines) {

      const trimmedLine = line.trim()

      // Start of a block
      if (inCodeBlock === false) {

        if (trimmedLine.startsWith('```')) {
          inCodeBlock = true
          codeLines = []
        }

        continue
      }

      // End of a block
      if (trimmedLine.startsWith('```')) {

        inCodeBlock = false
        codeBlocks.push(codeLines.join('\n').replace(/\s+$/, ``))
        codeLines = []

        continue
      }

      codeLines.push(line)
    }

    // An unterminated block still holds code
    if (inCodeBlock === true) {
      codeBlocks.push(codeLines.join('\n').replace(/\s+$/, ``))
    }

    // Fenced: only the fenced source is the source
    if (codeBlocks.length > 0) {
      return codeBlocks.join('\n\n') + `\n`
    }

    // Unfenced: the whole reply is the source
    const trimmedText = text.trim()

    if (trimmedText === ``) {
      console.log(`${fnName}: empty reply`)
      return text
    }

    return trimmedText + `\n`
  }
}
