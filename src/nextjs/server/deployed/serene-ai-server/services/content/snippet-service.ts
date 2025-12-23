export class SnippetService {

  // Consts
  clName = 'SnippetService'

  // Code
  getSnippet(text: string) {

    const maxChars = 256

    if (text.length < maxChars) {
      return text
    }

    return text.substring(0, maxChars) + '..'
  }
}
