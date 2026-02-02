import chalk from 'chalk'
import { PrismaClient, TechProvider, TechProviderApiKey } from '@prisma/client'
import { TechProviderApiKeyModel } from '@/serene-core-server/models/tech/tech-provider-api-key-model'
import { TechProviderModel } from '@/serene-core-server/models/tech/tech-provider-model'
import { SereneCoreServerTypes } from '@/serene-core-server/types/user-types'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { SereneAiProviderProvides } from '../../types/server-only-types'
import { AiTechDefs } from '../../types/tech-defs'

// Models
const techProviderApiKeyModel = new TechProviderApiKeyModel()
const techProviderModel = new TechProviderModel()

// Services
const consoleService = new ConsoleService()

// Class
export class AiKeysCliReplService {

  // Consts
  clName = 'AiKeysCliReplService'

  // Code
  async addApiKey(prisma: PrismaClient) {

    // Banner
    console.log(``)
    console.log(chalk.bold(`─── Add an API key ───`))
    console.log(``)

    // Create a map of tech providers
    const techProvidersMap = await
      this.createTechProvidersMap(prisma)

    // List options
    console.log(``)
    console.log(`Select a provider:`)
    console.log(`[b] Back`)

    for (const [techProviderNo, techProvider] of techProvidersMap.entries()) {

      console.log(`${techProviderNo}. ${techProvider.name}`)
    }

    // Get menu no
    const menuNo = await
      consoleService.askQuestion('> ')

    // Read the selection
    if (techProvidersMap.has(menuNo)) {

      await this.addApiKeyWithTechProvider(
        prisma,
        techProvidersMap.get(menuNo)!)

    } else if (menuNo === 'b') {
      return
    }
  }

  async addApiKeyWithTechProvider(
    prisma: PrismaClient,
    techProvider: TechProvider) {

    // Gemini keys need to specify free/paid
    var pricingTier = SereneCoreServerTypes.paid

    if (techProvider.name === AiTechDefs.googleGeminiProvider) {

      const pricingTier = await
        this.getPricingTier()

      if (pricingTier == null) {
        return
      }
    }

    // API key banner
    console.log(``)
    console.log(`Enter your API key`)

    // Get api key
    const apiKey = await
      consoleService.askQuestion('> ')

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

    // Create numbered map, starting at 2 (1 is back)
    var techProviderNo = 2
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
      console.log(`Is your key free or paid?`)
      console.log(`[b] Back`)
      console.log(`[f] Free`)
      console.log(`[p] Paid`)

      // Get input
      const input = await
        consoleService.askQuestion('> ')

      switch (input) {

        case 'b': {
          return undefined
        }

        case 'f': {
          return SereneCoreServerTypes.free
        }

        case 'p': {
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
    var selection = 2
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
    console.log(`[b] Back`)

    for (const [selection, apiKey] of apiKeysMap) {

      console.log(`${selection}. ${apiKey.name}`)
    }

    // Get menu no
    const menuNo = await
      consoleService.askQuestion('> ')

    // Handle selection
    if (apiKeysMap.has(menuNo)) {

      await this.viewApiKey(
        prisma,
        apiKeysMap.get(menuNo)!)
    }
  }

  async main(prisma: PrismaClient) {

    while (true) {

      // Banner and options
      console.log(``)
      console.log(chalk.bold(`─── AI keys maintenance ───`))
      console.log(``)
      console.log(`[b] Back`)
      console.log(`[a] Add an API key`)
      console.log(`[l] List existing API keys`)

      // Get menu no
      const menuNo = await
        consoleService.askQuestion('> ')

      // Handle menu no
      switch (menuNo) {

        case 'b': {
          return
        }

        case 'a': {
          await this.addApiKey(prisma)
          break
        }

        case 'l': {
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
    console.log(`Delete this key?`)
    console.log(`[y] or [n]`)

    // Get menu no
    const input = await
      consoleService.askQuestion('> ')

    // Delete?
    if (!['Y', 'y'].includes(input.trim())) {
      return
    }

    // Delete the key
    await techProviderApiKeyModel.deleteById(
      prisma,
      apiKey.id)
  }
}
