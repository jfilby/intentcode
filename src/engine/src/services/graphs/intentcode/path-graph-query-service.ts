import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { FsUtilsService } from '../../utils/fs-utils-service'

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
          prisma: PrismaClient,
          projectIntentCodeNode: SourceNode,
          fullPath: string) {

    // Debug
    const fnName = `${this.clName}.getIntentCodePathAsGraph()`

    // Get project source path
    const projectSourcePath = (projectIntentCodeNode.jsonContent as any)?.path

    // Validate project path
    if (projectSourcePath == null ||
        !fullPath.startsWith(projectSourcePath)) {

      throw new CustomError(
        `${fnName}: Invalid path: ${fullPath} for project source node: ` +
        `${projectSourcePath}`)
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
    var intentCodeDir: SourceNode = projectIntentCodeNode

    for (const dir of dirs) {

      if (dir.length === 0) {
        break
      }

      // Try to get the dir node
      intentCodeDir = await
        sourceNodeModel.getByUniqueKey(
          prisma,
          intentCodeDir.id,
          projectIntentCodeNode.instanceId,
          SourceNodeTypes.intentCodeDir,
          dir)
    }

    // Try to get the node
    const intentCodeFile = await
            sourceNodeModel.getByUniqueKey(
              prisma,
              intentCodeDir.id,  // parentId
              projectIntentCodeNode.instanceId,
              SourceNodeTypes.intentCodeFile,
              filename)

    // Return filename's node
    return intentCodeFile
  }
}
