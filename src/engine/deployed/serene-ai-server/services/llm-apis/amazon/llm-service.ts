import { PrismaClient } from '@prisma/client'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { CustomError } from '@/serene-core-server/types/errors'
import { AmazonBedrockMessagesService } from './messages-service'

// Note: the invoke style doesn't use an API key but relies on the AWS cli to
// have setup the credentials before use.

// Services
const amazonBedrockMessagesService = new AmazonBedrockMessagesService()

// Class
export class AmazonBedrockLlmService {

  // Consts
  clName = 'AmazonBedrockLlmService'

  client: any = undefined

  // Code
  initClient() {

    // Don't reinit
    if (this.client != null) {
      return
    }

    // Init client
    this.client = new BedrockRuntimeClient({ region: 'us-east-1' })
  }

  async sendChatMessages(
    prisma: PrismaClient,
    tech: any,
    messagesWithRoles: any[],
    jsonMode: boolean = false) {

    // Debug
    const fnName = `${this.clName}.sendChatMessages()`

    console.log(`${fnName}: starting with variant: ${tech.variantName} ` +
                `model: ${tech.model}`)

    // console.log(`${fnName}: messagesWithRoles: ` +
    //   JSON.stringify(messagesWithRoles))

    // Validate
    if (tech == null) {
      throw new CustomError(`${fnName}: tech == null`)
    }

    // Init client
    await this.initClient()

    // Get modelId
    const modelId: string = tech.model

    // Invoke
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: messagesWithRoles,
        // model‑specific options can go here
      }),
    })

    const response = await this.client.send(command)
    const text = new TextDecoder().decode(response.body)

    // console.log(text)

    // Validate
    if (text == null) {
      throw new CustomError(`${fnName}: text == null`)
    }

    // Parse JSON
    const json = JSON.parse(text)

    // Parse the results
    const chatCompletionResults =
      amazonBedrockMessagesService.convertAmazonBedrockCompletionResults(json)

    // Return results
    return chatCompletionResults
  }
}
