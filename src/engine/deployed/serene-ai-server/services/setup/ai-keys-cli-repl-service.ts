import chalk from 'chalk'
import { confirm, input, select } from '@inquirer/prompts'
import { PrismaClient, TechProvider, TechProviderApiKey } from '@prisma/client'
import { TechProviderApiKeyModel } from '@/serene-core-server/models/tech/tech-provider-api-key-model'
import { TechProviderModel } from '@/serene-core-server/models/tech/tech-provider-model'
import { SereneCoreServerTypes } from '@/serene-core-server/types/user-types'
import { SereneAiProviderProvides } from '../../types/server-only-types'
import { AiTechDefs } from '../../types/tech-defs'

// Models
const techProviderApiKeyModel = new TechProviderApiKeyModel()
const techProviderModel = new TechProviderModel()

// Class
export class AiKeysCliReplService {

  // Consts
  clName = 'AiKeysCliReplService'

  backCommand = 'back'

  freeCommand = 'free'
  paidCommand = 'paid'

  addCommand = 'add'
  listCommand = 'list'

  // Code
  async addApiKey(prisma: PrismaClient) {

    // Banner
    console.log(``)
    console.log(chalk.bold(`─── Add an API key ───`))
    console.log(``)
    console.log(chalk.bold(`Tech provider:`))
    console.log(``)

    // Create a map of tech providers
    const techProvidersMap = await
      this.createTechProvidersMap(prisma)

    // Choices
    const choices = [
      {
        name: `Back`,
        value: this.backCommand
      }
    ]

    for (const [techProviderNo, techProvider] of techProvidersMap.entries()) {

      choices.push({
        name: techProvider.name,
        value: techProviderNo
      })
    }

    // Prompt
    const command = await select({
      message: `Select an option`,
      loop: false,
      pageSize: 10,
      choices: choices
    })

    // Read the selection
    if (techProvidersMap.has(command)) {

      await this.addApiKeyWithTechProvider(
        prisma,
        techProvidersMap.get(command)!)

    } else if (command === this.backCommand) {
      return
    }
  }

  async addApiKeyWithTechProvider(
    prisma: PrismaClient,
    techProvider: TechProvider) {

    // Gemini keys need to specify free/paid
    var pricingTier: string | undefined = SereneCoreServerTypes.paid

    if (techProvider.name === AiTechDefs.googleGeminiProvider) {

      pricingTier = await this.getPricingTier()

      if (pricingTier == null) {
        return
      }
    }

    // Spacing
    console.log(``)

    // Prompt for api key
    const apiKey = await
      input({ message: `Enter your API key` })

    // Define key name
    var keyName = techProvider.name

    if (pricingTier != null) {
      keyName += ` ${pricingTier}`
    }

    keyName += ` key`

    // Add entry
    await techProviderApiKeyModel.upsert(
      prisma,
      undefined,  // id
      techProvider.id,
      SereneCoreServerTypes.activeStatus,
      keyName,
      null,       // accountEmail
      apiKey,
      pricingTier)
  }

  async createTechProvidersMap(prisma: PrismaClient) {

    // Get tech providers for LLMs
    const techProviders = await
      techProviderModel.filter(
        prisma,
        SereneCoreServerTypes.activeStatus,
        [SereneAiProviderProvides.multiModalAi])

    // Create numbered map
    var techProviderNo = 1
    const techProvidersMap = new Map<string, TechProvider>()

    for (const techProvider of techProviders) {

      techProvidersMap.set(
        `${techProviderNo}`,
        techProvider)

      techProviderNo += 1
    }

    // Return
    return techProvidersMap
  }

  async getPricingTier() {

    while (true) {

      // Banner
      console.log(``)

      // Prompt
      const command = await select({
        message: `Is your key free or paid?`,
        loop: false,
        pageSize: 10,
        choices: [
          {
            name: `Back`,
            value: this.backCommand
          },
          {
            name: `Free`,
            value: this.freeCommand
          },
          {
            name: `Paid`,
            value: this.paidCommand
          }
        ]
      })

      // Handle command
      switch (command) {

        case this.backCommand: {
          return undefined
        }

        case this.freeCommand: {
          return SereneCoreServerTypes.free
        }

        case this.paidCommand: {
          return SereneCoreServerTypes.paid
        }
      }
    }
  }

  async listApiKeys(prisma: PrismaClient) {

    // Get API keys
    const apiKeys = await
      techProviderApiKeyModel.filter(prisma)

    // Create a selection map from the keys
    var selection = 1
    const apiKeysMap = new Map<string, TechProviderApiKey>()

    for (const apiKey of apiKeys) {

      apiKeysMap.set(
        `${selection}`,
        apiKey)

      selection += 1
    }

    // Banner and options
    console.log(``)
    console.log(chalk.bold(`─── Available keys ───`))
    console.log(``)

    // Choices
    const choices = [
      {
        name: `Back`,
        value: this.backCommand
      }
    ]

    for (const [selection, apiKey] of apiKeysMap) {

      choices.push({
        name: apiKey.name,
        value: selection
      })
    }

    // Prompt
    const command = await select({
      message: `Select an option`,
      loop: false,
      pageSize: 10,
      choices: choices
    })

    // Handle selection
    if (apiKeysMap.has(command)) {

      await this.viewApiKey(
        prisma,
        apiKeysMap.get(command)!)
    }
  }

  async main(prisma: PrismaClient) {

    while (true) {

      // Banner and options
      console.log(``)
      console.log(chalk.bold(`─── AI keys maintenance ───`))
      console.log(``)

      // Prompt
      const command = await select({
        message: `Is your key free or paid?`,
        loop: false,
        pageSize: 10,
        choices: [
          {
            name: `Back`,
            value: this.backCommand
          },
          {
            name: `Add an API key`,
            value: this.addCommand
          },
          {
            name: `List existing API keys`,
            value: this.listCommand
          }
        ]
      })

      // Handle menu no
      switch (command) {

        case this.backCommand: {
          return
        }

        case this.addCommand: {
          await this.addApiKey(prisma)
          break
        }

        case this.listCommand: {
          await this.listApiKeys(prisma)
          break
        }

        default: {
          console.log(`Invalid selection`)
        }
      }
    }
  }

  async viewApiKey(
    prisma: PrismaClient,
    apiKey: TechProviderApiKey) {

    // Banner
    console.log(``)
    console.log(chalk.bold(`─── View API key ───`))
    console.log(``)

    // Prompt for confirmation
    const deleteThisKey = await
      confirm({
        default: false,
        message: `Delete this key?`
      })

    // Delete?
    if (deleteThisKey === false) {
      return
    }

    // Delete the key
    await techProviderApiKeyModel.deleteById(
      prisma,
      apiKey.id)
  }
}
