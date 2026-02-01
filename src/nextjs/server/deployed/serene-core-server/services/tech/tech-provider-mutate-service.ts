import * as fs from 'fs'
import * as path from 'path'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { CustomError } from '../../types/errors'
import { TechProviderApiKeyModel } from '../../models/tech/tech-provider-api-key-model'
import { TechProviderModel } from '../../models/tech/tech-provider-model'
import { ConsoleService } from '../console/service'

// Models
const techProviderApiKeyModel = new TechProviderApiKeyModel()
const techProviderModel = new TechProviderModel()

// Services
const consoleService = new ConsoleService()

// Class
export class TechProviderMutateService {

  // Consts
  clName = 'TechProviderMutateService'

  // Code
  async getJsonFiles(
          dir: string,
          fileList: string[] = []): Promise<any> {

    // Debug
    const fnName = `${this.clName}.walkDir()`

    // Read the dir
    var files = await fs.promises.readdir(dir)

    // Walk files
    for (const file of files) {

      // Stat the file
      const filePath = path.join(dir, file)
      const stat = await fs.promises.stat(filePath)

      // If a directory, call this function
      if (stat.isDirectory() === false) {

        if (file.endsWith('.json')) {
          fileList.push(filePath)
        }
      }
    }

    // Debug
    // console.log(`${fnName}: fileList: ${fileList.length}`)

    // Return file list
    return fileList
  }

  async loadJson(
          prisma: PrismaClient,
          importJsons: any[]) {

    // Debug
    const fnName = `${this.clName}.loadJson()`

    // Vars
    var records = 0

    // Process each record
    for (const importJson of importJsons) {

      // Get the TechProvider
      const techProvider = await
              techProviderModel.getByName(
                prisma,
                importJson.techProviderName)

      if (techProvider == null) {
        throw new CustomError(`${fnName}: techProvider not found for name: ` +
                              JSON.stringify(importJson.techProviderName))
      }

      // Handle optional/nullable fields
      var pricingTier: string | null = null

      if (importJson.pricingTier != null) {
        pricingTier = importJson.pricingTier
      }

      // Upsert
      const techProviderApiKey = await
              techProviderApiKeyModel.upsert(
                prisma,
                undefined,  // id
                techProvider.id,
                importJson.status,
                importJson.name,
                importJson.accountEmail,
                importJson.apiKey,
                pricingTier)

      // Inc
      records = records + 1
    }

    // Debug
    console.log(`${fnName}: ${records} upserted`)
  }

  async cliLoadJsonStr(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.cliLoadJsonStr()`

    // Read in the JSON string
    console.log(``)
    console.log(chalk.bold(`─── Load API keys ───`))
    console.log(``)
    console.log(`${fnName}: Enter the path containing the .json files ` +
                `with the tech provider API keys to load`)

    const jsonPath = await
            consoleService.askQuestion('> ')

    // Walk the path and get all json files
    const files = await this.getJsonFiles(jsonPath)

    // Process the JSON
    for (const file of files) {

      console.log(`${fnName}: processing file: ${file}`)

      const jsonStr = fs.readFileSync(file, 'utf-8')
      const json = JSON.parse(jsonStr)

      await this.loadJson(
              prisma,
              json)
    }
  }
}
