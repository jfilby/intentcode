export class TextParsingService {

  // Consts
  clName = 'TextParsingService'

  unknownSyntax = '<unknown>'  // Can't be a blank string, used for checking
                               // markdown syntax blocks

  // Code
  combineTextExtracts(
    extracts: any[],  // Extracted using this.getTextExtracts()
    syntax: string = '') {

    var textExtracts: string[] = []

    for (const extract of extracts) {

      textExtracts.push(
        extract.text
        // Remove opening & closing backticks
        .replace(/^`|`$/g, '')
        // Remove lines starting with ```
        .replace(/^[ \t]*```.*$\n?/gm, ''))
    }

    var output = textExtracts.join('\n')

    if (!output.endsWith('\n')) {
      output += '\n'
    }

    return output
  }

  getJsonExtractExcludingQuotesWithBraces(
    input: string,
    jsonMustBeInArray: boolean = false) {

    // Debug
    const fnName = `${this.clName}.getJsonExtractExcludingQuotesWithBraces()`

    // Get all JSON extracts
    const jsonExtractsResults =
            this.getTextExtracts(
              input,
              'json')

    // console.log(`${fnName}: jsonExtractsResults: ` +
    //             JSON.stringify(jsonExtractsResults))

    if (jsonExtractsResults.status === false) {
      return jsonExtractsResults
    }

    if (jsonExtractsResults.extracts.length === 0) {
      return {
        status: true,
        extracts: []
      }
    }

    // Exclude those that use braces in quoted strings
    var extractsWithoutQuotesWithBraces: string[] = []

    for (const jsonExtract of jsonExtractsResults.extracts) {

      // Get the text
      var jsonText = jsonExtract['text']

      // Check for quotes with braces
      if (jsonText.indexOf('"{') >= 0 &&
          jsonText.indexOf('}"') >= 0) {

        continue
      }

      // Must the JSON extracted be in an array?
      if (jsonMustBeInArray === true &&
          jsonText[0] === '{') {

        // If only a map, then wrap in an array
        jsonText = `[${jsonText}]`
      }

      // Add extract
      extractsWithoutQuotesWithBraces.push(jsonText)
    }

    // Remove comments
    var finalExtracts: string[] = []

    for (const extract of extractsWithoutQuotesWithBraces) {

      const withoutComments = this.getCleanJsonExtract(extract)

      finalExtracts.push(withoutComments)
    }

    // Return the remaining extracts
    return {
      status: true,
      extracts: finalExtracts
    }
  }

  getCleanJsonExtract(input: string) {

    const lines = input.split('\n')

    var linesWithoutComments: string[] = []

    for (const line of lines) {

      var lineTrimmed = line.trim()

      // Discard comma-only lines
      if (lineTrimmed === ',') {
        continue
      }

      // Get rid of commas directly after map open chars
      lineTrimmed = lineTrimmed.replace('{,', '{')

      // Discard whole-line comments
      if (lineTrimmed.slice(0, 2) === '//') {
        continue
      }

      // Find trailing comments
      var commentStarts = -1

      for (var i = line.length - 1; i >= 0; i--) {

        // Get previous chat
        var prevChar = ''

        if (i > 0) {
          prevChar = line[i - 1]
        }

        // Handle comment found
        if (line[i] === '/' &&
            prevChar === '/') {

          commentStarts = i - 1
        }

        if (line[i] === '"') {
          break
        }
      }

      // Contine to next line conditions (comment found or double-quote of a string)
      if (commentStarts > -1) {

        linesWithoutComments.push(line.slice(0, commentStarts))
        continue
      }

      // No comments for the line
      linesWithoutComments.push(line)
    }

    return linesWithoutComments.join('\n')
  }

  getTextExtracts(
    input: string,
    syntax: string = '',
    extractCodeOnly: boolean = false) {

    // Debug
    const fnName = `${this.clName}.getTextExtracts()`

    // Vars
    var syntaxName = syntax

    // Handle an unknown syntax
    if (syntax == null) {
      syntax = this.unknownSyntax
      syntaxName = this.unknownSyntax
    }

    // Split into multiple lines
    const lines = input.split('\n')

    // Debug
    // console.log(`${fnName}: input: ${input}`)
    // console.log(`${fnName}: lines: ${lines.length}`)

    // Check for no lines
    if (lines.length === 0) {
      return {
        status: true,
        extracts: [{
          syntax: this.unknownSyntax,
          text: ''
        }]
      }
    }

    // Is this a JSON string (only)?
    if (lines[0][0] === '[' ||
        lines[0][0] === '{') {

      return {
        status: true,
        extracts: [{
          syntax: 'json',
          text: lines.join('')
        }]
      }
    }

    // Look for a JSON extract
    var extracts: any[] = []
    var currentExtract = ''
    var inCodeExtract = false
    var suddenCodeBlock = false

    for (var line of lines) {

      // Trim the line, useful for syntax matching
      const trimmedLine = line.trim()

      // Start of a code extract?
      if (inCodeExtract === false) {
      //     syntax === this.unknownSyntax) {

        // Code extract begins
        if (trimmedLine.slice(0, 3) === '```') {

          syntax = trimmedLine.slice(3).trim()

          if (syntax === '') {
            syntax = this.unknownSyntax
          }

          // console.log(`${fnName}: starting markdown code block with ` +
          //             `syntax: ` + syntax)

          inCodeExtract = true
          currentExtract = ''
          continue  // Start from the next line
        }

        // Sudden start of JSON
        if (line[0] === '[' ||
            line[0] === '{') {

          extracts.push({
            syntax: syntax,
            text: currentExtract
          })

          syntax = 'json'
          suddenCodeBlock = true
          inCodeExtract = true
          currentExtract = ''
        }
      }

      // End of an extract? Or continuation of an extract?
      if (inCodeExtract === true) {

        // console.log(`${fnName}: line: ${line}`)

        if (trimmedLine.length >= 3) {
          if (trimmedLine === '```') {

            if (extractCodeOnly === false) {
              inCodeExtract = false
            } else {
              inCodeExtract = true
            }

            // console.log(`${fnName}: end of syntax block, currentExtract: ` +
            //             currentExtract)

            extracts.push({
              syntax: syntax,
              text: currentExtract
            })

            syntax = ''
            currentExtract = ''

            continue  // End before the next line
          }
        }

        // Special handling of JSON ending for unknown syntax
        if (syntax === 'json') {

          if (line[0] === ']' ||
              line[0] === '}') {

            if (extractCodeOnly === false) {
              inCodeExtract = false
            } else {
              inCodeExtract = true
            }

            extracts.push({
              syntax: syntax,
              text: currentExtract
            })

            syntax = this.unknownSyntax
            currentExtract += line
            currentExtract = ''
            suddenCodeBlock = false
          }
        }
      }

      // Continuation of an extract
      if (currentExtract !== '') {
        currentExtract += '\n'
      }

      // console.log(`${fnName}: appending line to currentExtract..`)

      currentExtract += line
    }

    // Debug
    // console.log(`${fnName}: extractCodeOnly: ${JSON.stringify(extractCodeOnly)}`)
    // console.log(`${fnName}: inCodeExtract: ${JSON.stringify(inCodeExtract)}`)
    // console.log(`${fnName}: extracts: ${JSON.stringify(extracts)}`)
    // console.log(`${fnName}: currentExtract: ${currentExtract}`)

    // Check state
    if ((inCodeExtract === true &&
         extractCodeOnly === true) ||
        extractCodeOnly === false) {

      if (currentExtract.trim() !== '') {

        extracts.push({
          syntax: syntax,
          text: currentExtract
        })
      }
    }

    // Handle a case where the input given was the code, because no extracts
    // could be found.
    if (extracts.length === 0) {

      extracts = [{
        syntax: syntax,
        text: input
      }]
    }

    // Return OK
    return {
      status: true,
      extracts: extracts
    }
  }
}
