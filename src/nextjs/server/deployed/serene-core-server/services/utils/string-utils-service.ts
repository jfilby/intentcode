export class StringUtilsService {

  toNaturalCase(input: string) {

    if (!input) return ''

    // Step 1: Normalize input (handle snake_case, kebab-case, camelCase)
    let words = input
      // Insert space before capital letters (camelCase to space-separated)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Replace underscores and hyphens with space
      .replace(/[_\-]+/g, ' ')
      // Split into words
      .split(' ')

    // Step 2: Capitalize each word, but keep acronyms (like TV, AI) in uppercase
    return words
      .map((word: string) => {
        if (word.length <= 2 && word === word.toUpperCase()) {
          // likely an acronym: TV, AI, ML
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ')
  }

  getShortLocaleString(date: Date) {

    const tz = date.toLocaleDateString('en', {
                 day: '2-digit',
                 timeZoneName: 'short'
               }).slice(4) 

    return `${date.toLocaleString()} ${tz}`
  }

  getSnippet(
    text: string,
    maxChars: number) {

    if (text.length < maxChars) {
      return text
    }

    return text.substring(0, maxChars) + '..'
  }
}
