import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { FsUtilsService } from '../../utils/fs-utils-service.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const fsUtilsService = new FsUtilsService()

// Class
export class IntentCodePathGraphQueryService {

  // Consts
  clName = 'IntentCodePathGraphQueryService'

  // Code
  async getIntentCodePathAsGraph(
          store: ProjectStore,
          projectIntentCodeNode: SourceNodeRecord,
          fullPath: string) {

    // Debug
    const fnName = `${this.clName}.getIntentCodePathAsGraph()`

    // Get project source path
    const jsonContent = projectIntentCodeNode.jsonContent
    const projectSourcePath =
      jsonContent != null &&
      typeof jsonContent === 'object' &&
      'path' in jsonContent &&
      typeof jsonContent.path === 'string'
        ? jsonContent.path
        : undefined

    // Validate project path
    if (projectSourcePath == null ||
        !fsUtilsService.isPathWithin(fullPath, projectSourcePath)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: Invalid path: ${fullPath} for project source ` +
          `node: ${projectSourcePath}`
      })
    }

    // Strip project path from fullPath prefix
    // The fullPath must have been verified as starting with the project path
    const relativePath = fullPath.slice(projectSourcePath.length)

    // Split up dirs and filename
    const filename = fsUtilsService.getFilenamePart(relativePath)
    const dirsPath = fsUtilsService.getDirectoriesPart(relativePath)
    const dirs = fsUtilsService.getDirectoriesArray(dirsPath)

    // Debug
    // console.log(`${fnName}: relativePath: ${relativePath}`)
    // console.log(`${fnName}: dirsPath: ${dirsPath}`)
    // console.log(`${fnName}: dirs: ${dirs}`)

    // Get/create nodes for dirs
    var intentCodeDir: SourceNodeRecord = projectIntentCodeNode

    for (const dir of dirs) {

      // Try to get the dir node
      const found = await
        sourceNodeModel.getByUniqueKey(
          store,
          intentCodeDir.id,
          projectIntentCodeNode.projectId,
          SourceNodeTypes.intentCodeDir,
          dir)

      if (found == null) {

        throw new IntentError({
          category: 'StorageError',
          stage: fnName,
          message: `${fnName}: no IntentCode dir node for dir: ${dir}`,
          detail: `under the node ${intentCodeDir.id}`
        })
      }

      intentCodeDir = found
    }

    // Try to get the node
    const intentCodeFile = await
            sourceNodeModel.getByUniqueKey(
              store,
              intentCodeDir.id,  // parentId
              projectIntentCodeNode.projectId,
              SourceNodeTypes.intentCodeFile,
              filename)

    // Return filename's node
    return intentCodeFile
  }
}
