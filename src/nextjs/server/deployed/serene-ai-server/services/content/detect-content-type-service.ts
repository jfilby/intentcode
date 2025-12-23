export class DetectContentTypeService {

  // Consts
  textType = ''
  markdownType = 'md'

  // Code
  detect(content: string) {

    var contentType = this.textType

    // Detect markdown
    contentType = this.detectMarkdown(content)

    if (contentType !== this.textType) {
      return contentType
    }

    // Return
    return contentType
  }

  detectMarkdown(content: string) {

    // Detect headings
    const firstTwoChars = content.slice(0, 2)
    const firstThreeChars = content.slice(0, 3)

    if (firstTwoChars === '# ' ||
        firstThreeChars === '## ') {

      return this.markdownType
    }

    // Detect a list
    if (firstTwoChars === '* ' ||
        firstTwoChars === '- ') {

      return this.markdownType
    }

    // Detect bold text
    const bold1 = content.indexOf('**')
    
    if (bold1 >= 0) {
      const bold2 = content.indexOf('**', bold1 + 2)

      if (bold2 > bold1) {
        return this.markdownType
      }
    }

    return this.textType
  }
}
