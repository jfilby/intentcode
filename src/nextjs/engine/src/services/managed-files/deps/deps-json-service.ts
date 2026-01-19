import fs from 'fs'
import path from 'path'
import * as z from 'zod'
import { isEqual } from 'lodash'
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { DependenciesQueryService } from '@/services/graphs/dependencies/query-service'
import { DotIntentCodeGraphQueryService } from '@/services/graphs/dot-intentcode/graph-query-service'

// Services
const dependenciesQueryService = new DependenciesQueryService()
const dotIntentCodeGraphQueryService = new DotIntentCodeGraphQueryService()

// Class
export class DepsJsonService {

  // Consts
  clName = 'DepsJsonService'

  depsJson = `deps.json`

  // Code
  async readFile(
          prisma: PrismaClient,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.readFile()`

    // Found var
    var found = false

    // Get dotIntentCode node
    const projectDotIntentCodeNode = await
            dotIntentCodeGraphQueryService.getDotIntentCodeProject(
              prisma,
              projectNode)

    // Validate
    if (projectDotIntentCodeNode == null) {
      console.error(`Missing .intentcode project node`)
      process.exit(1)
    }

    // Determine the filename
    const dotIntentFilePath = projectDotIntentCodeNode.jsonContent?.path
    const filename = `${dotIntentFilePath}${path.sep}${this.depsJson}`

    // Check if the file exists
    if (await fs.existsSync(filename) === false) {
      return { found, undefined, filename }
    }

    found = true

    // Read the file
    const depsNodeStr = await
            fs.readFileSync(filename, 'utf-8')

    // Debug
    console.log(`${fnName}: depsNodeStr: ${depsNodeStr}`)

    // Parse JSON
    const data = JSON.parse(depsNodeStr)

    // Validate by schema, but don't use the return object, it could differ
    // from the original
    const validatedData = this.validate(data)

    // Return
    return { found, data, filename }
  }

  validate(depsNode: any) {

    // Zod object
    const DepsNode = z.object({
      extensions: z.record(
        z.string(),  // extension name
        z.string()   // minVersionNo
      ).optional(),

      tool: z.string().optional(),

      runtimes: z.record(
        z.string(),
        z.record(
          z.string(),
          z.string()
        ).optional()
      ).optional()
    })

    // Validate
    const data = DepsNode.parse(depsNode)

    // Return
    return data
  }

  async verifyDepsNodeSyncedToDepsJson(
          prisma: PrismaClient,
          projectNode: SourceNode,
          writeIfFileNotFound: boolean = true) {

    // Debug
    const fnName = `${this.clName}.verifyDepsNodeSyncedToDepsJson()`

    // Get Deps node
    const depsNode = await
            dependenciesQueryService.getDepsNode(
              prisma,
              projectNode)

    // Read deps.json
    const { found, data, filename } = await
            this.readFile(
              prisma,
              projectNode)

    // File not found?
    if (found === false) {

      // Write file if not found?
      if (writeIfFileNotFound === true) {

        await this.writeToFile(
                prisma,
                projectNode,
                depsNode)
      }

      // Done
      return
    }

    // Verify that they're the same
    if (isEqual(
          depsNode.jsonContent,
          data) === false) {

      console.log(`${fnName}: depsNode.jsonContent: ` +
                  JSON.stringify(depsNode.jsonContent))

      console.log(`${fnName}: ${filename}`)
      console.log(`${fnName}: deps.json file: ` + JSON.stringify(data))

      throw new CustomError(`${fnName}: depsNode (jsonContent) !== deps.json`)
    }
  }

  async writeToFile(
          prisma: PrismaClient,
          projectNode: SourceNode,
          depsNode: any) {

    // Get dotIntentCode node
    const projectDotIntentCodeNode = await
            dotIntentCodeGraphQueryService.getDotIntentCodeProject(
              prisma,
              projectNode)

    // Validate
    if (projectDotIntentCodeNode == null) {
      console.error(`Missing .intentcode project node`)
      process.exit(1)
    }

    // Validate by schema
    const data = this.validate(depsNode.jsonContent)

    // Determine the filename
    const dotIntentFilePath = projectDotIntentCodeNode.jsonContent?.path
    const filename = `${dotIntentFilePath}${path.sep}${this.depsJson}`

    // Write the file
    const prettyData =
            JSON.stringify(
              depsNode.jsonContent,
              null,
              2) +
            `\n`

    await fs.writeFileSync(
            filename,
            prettyData)
  }
}
