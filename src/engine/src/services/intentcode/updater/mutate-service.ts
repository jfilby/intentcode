import fs from 'fs'
import { IntentError } from '@/core/errors.js'
import { ProjectStore } from '@/core/store.js'
import { BuildData } from '@/types/build-types.js'
import { FileDelta, FileOps, ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types.js'
import { FsUtilsService } from '@/services/utils/fs-utils-service.js'
import { TextService } from '@/services/utils/text-service.js'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service.js'

// Service
const fsUtilsService = new FsUtilsService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const textService = new TextService()

// Class
export class IntentCodeUpdaterMutateService {

  // Consts
  clName = 'IntentCodeUpdaterMutateService'

  // Code
  async processFileDelta(
    store: ProjectStore,
    buildData: BuildData,
    fileDelta: FileDelta) {

    // Debug
    const fnName = `${this.clName}.processFileDelta()`

    // Output
    // Pre-process the content (if needed)
    if (fileDelta.content != null) {

      fileDelta.content =
        textService.extractCode(fileDelta.content)
    }

    // Get projectDetails
    const projectDetails = buildData.projects[fileDelta.projectNo]

    // Validate
    if (projectDetails == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: projectDetails == null`
      })
    }

    // Get IntentCode path
    const projectJsonContent = projectDetails.projectIntentCodeNode.jsonContent
    const intentCodePath =
      projectJsonContent != null && typeof projectJsonContent === 'object' &&
      'path' in projectJsonContent && typeof projectJsonContent.path === 'string'
        ? projectJsonContent.path
        : undefined

    // Validate. Without the path there is no intent dir to write a delta into.
    if (intentCodePath == null) {
      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message: `${fnName}: the IntentCode project node has no path`
      })
    }

    // Determine intentCodeFullPath. fileDelta.relativePath comes straight from
    // the LLM, so resolve it inside the project's intent dir and reject any
    // '..' escape. Without this, a '..' segment let the model write to, or
    // unlink, any file the process could reach.
    const intentCodeFullPath =
      fsUtilsService.resolvePathWithin(
        intentCodePath,
        fileDelta.relativePath)

    if (ServerOnlyTypes.verbosity >= VerbosityLevels.min) {

      console.log(`.. ${fileDelta.fileOp} ${intentCodeFullPath}`)
    }

    // Upsert SourceCode node path
    if (fileDelta.fileOp === FileOps.set) {

      // Upsert IntentCode path graph
      await intentCodePathGraphMutateService.upsertIntentCodePathAsGraph(
        store,
        projectDetails.projectIntentCodeNode,
        intentCodeFullPath)

      // Write source file
      await fsUtilsService.writeTextFile(
        intentCodeFullPath,
        fileDelta.content + `\n`,
        true)  // createMissingDirs

    } else if (fileDelta.fileOp === FileOps.del) {

      // Delete IntentCode path graph
      await intentCodePathGraphMutateService.deleteIntentCodePathAsGraph(
        store,
        projectDetails.projectIntentCodeNode,
        intentCodeFullPath)

      // Delete file
      await fs.unlinkSync(intentCodeFullPath)
    }
  }

  async processFileDeltas(
    store: ProjectStore,
    buildData: BuildData,
    fileDeltas: FileDelta[]) {

    // Output
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.min) {

      // No changes?
      if (fileDeltas.length === 0) {

        console.log(`No changes to IntentCode`)
      } else {

        console.log(`${fileDeltas.length} IntentCode changes..`)
      }
    }

    // Iterate fileDeltas
    for (const fileDelta of fileDeltas) {

      // Process fileDelta
      await this.processFileDelta(
        store,
        buildData,
        fileDelta)
    }
  }
}
