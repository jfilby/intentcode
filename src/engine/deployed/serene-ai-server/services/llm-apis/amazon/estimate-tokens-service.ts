import { CustomError } from '@/serene-core-server/types/errors'

export class EstimateAmazonBedrockTokensService {

  // Consts
  clName = 'EstimateAmazonBedrockTokensService'

  estimatedOutputTokens = 50

  // Code
  estimateInputTokens(messages: any[]) {

    // Debug
    const fnName = `${this.clName}.estimateInputTokens()`

    // console.log(`${fnName}: starting with messages: ` +
    //   JSON.stringify(messages))

    // Calculate total length of words
    var words = 0

    for (const message of messages) {

      // console.log(`${fnName}: message: ${JSON.stringify(message)}`)

      // Validate
      if (message.content == null) {
        throw new CustomError(`${fnName}: message.content == null`)
      }

      // Add role (1: 'role: ')
      words += 1

      // Debug
      // console.log(`${fnName}: typeof message.content: ` +
      //   typeof message.content)

      // Add messages (if a string)
      for (const messageContent of message.content) {

        // OpenAI format
        words += messageContent.text.split(' ').length
      }
    }

    // Calculate input tokens
    const tokens = words / 4 * 3

    // Debug
    // console.log(`${fnName}: tokens: ${tokens}`)

    // Return
    return tokens
  }

  estimateOutputTokens(messages: string[]) {

    // Debug
    const fnName = `${this.clName}.estimateOutputTokens()`

    // console.log(`${fnName}: starting..`)

    // Calculate total length of words
    var words = 0

    for (const message of messages) {

      // console.log(`${fnName}: message: ${JSON.stringify(message)}`)

      words += message.split(' ').length
    }

    // Calculate input tokens
    const tokens = words / 4 * 3

    // Debug
    // console.log(`${fnName}: tokens: ${tokens}`)

    // Return
    return tokens
  }
}
