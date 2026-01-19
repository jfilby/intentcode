import fs from 'fs'
import path from 'path'
import * as z from 'zod'
import { PrismaClient, SourceNode } from '@prisma/client'
import { DotIntentCodeGraphQueryService } from '@/services/graphs/dot-intentcode/graph-query-service'

// Services
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

    // Get project specs node
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

    // Read the file
    const depsNodeStr = await
            fs.readFileSync(filename, 'utf-8')

    const depsNode = JSON.parse(depsNodeStr)

    // Validate by schema
    const data = this.validate(depsNode)

    // Return
    return { data, filename }
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
        z.string(),  // key
        z.string(),  // value
      ).optional()
    })

    // Validate
    const data = DepsNode.parse(depsNode)

    // Return
    return data
  }

  async writeToFile(
          prisma: PrismaClient,
          projectNode: SourceNode,
          depsNode: any) {

    // Get project specs node
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
    const data = this.validate(depsNode)

    // Determine the filename
    const dotIntentFilePath = projectDotIntentCodeNode.jsonContent?.path
    const filename = `${dotIntentFilePath}${path.sep}${this.depsJson}`

    // Write the file
    const prettyData =
            JSON.stringify(
              data,
              null,
              2) +
            `\n`

    await fs.writeFileSync(
            filename,
            prettyData)
  }
}
