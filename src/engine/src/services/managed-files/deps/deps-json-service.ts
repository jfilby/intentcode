import fs from 'fs'
import path from 'path'
import * as z from 'zod'
import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types.js'
import { DotIntentCodeGraphQueryService } from '@/services/graphs/dot-intentcode/graph-query-service.js'

// Services
const dotIntentCodeGraphQueryService = new DotIntentCodeGraphQueryService()

// Class
export class DepsJsonService {

  // Consts
  clName = 'DepsJsonService'

  depsJson = `deps.json`

  // Code
  async readFile(
          store: ProjectStore,
          projectNode: SourceNodeRecord) {

    // Found var
    let found = false

    // Get dotIntentCode node
    const projectDotIntentCodeNode = await
            dotIntentCodeGraphQueryService.getDotIntentCodeProject(
              store,
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
    // console.log(`${fnName}: depsNodeStr: ${depsNodeStr}`)

    // Parse JSON
    const data = JSON.parse(depsNodeStr)

    // Validate by schema, but don't use the return object, it could differ
    // from the original
    this.validate(data)

    // Return
    return { found, data, filename }
  }

  validate(depsNode: unknown) {

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

  async writeToFile(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          depsNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.writeToFile()`

    console.log(`${fnName}: writing deps source file..`)

    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {

      console.log(`${fnName}: depsNode.jsonContent: ` +
        JSON.stringify(depsNode.jsonContent))
    }

    // Get dotIntentCode node
    const projectDotIntentCodeNode = await
      dotIntentCodeGraphQueryService.getDotIntentCodeProject(
        store,
        projectNode)

    // Validate
    if (projectDotIntentCodeNode == null) {
      console.error(`Missing .intentcode project node`)
      process.exit(1)
    }

    // The path is where deps.json lives, and the node it comes from is only
    // present for a project set up with a config directory.
    const dotIntentFilePath =
      projectDotIntentCodeNode.jsonContent?.path

    if (typeof dotIntentFilePath !== 'string' ||
        dotIntentFilePath === '') {

      throw new IntentError({
        category: 'ProjectError',
        stage: fnName,
        message: 'the .intentcode node records no path, so there is nowhere ' +
          'to write deps.json'
      })
    }

    // Validate by schema, so a malformed deps node is refused before it
    // becomes a file the user has to unpick.
    this.validate(depsNode.jsonContent)

    const filename = path.join(dotIntentFilePath, this.depsJson)

    fs.mkdirSync(dotIntentFilePath, { recursive: true })

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
