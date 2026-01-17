import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SourceNodeTypes } from '@/types/source-graph-types'
import { FsUtilsService } from '../../utils/fs-utils-service'
import { DotIntentCodeGraphMutateService } from './graph-mutate-service'

// Services
const dotIntentCodeGraphMutateService = new DotIntentCodeGraphMutateService()
const fsUtilsService = new FsUtilsService()

// Class
export class DotIntentCodePathGraphMutateService {

  // Consts
  clName = 'DotIntentCodePathGraphMutateService'

  // Code
  async getOrCreateDotIntentCodeConfigFilePathAsGraph(
          prisma: PrismaClient,
          projectDotIntentCodeNode: SourceNode,
          fileSourceNodeType: SourceNodeTypes,
          fullPath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateDotIntentCodeConfigFilePathAsGraph()`

    // Get project source path
    const projectSourcePath = (projectDotIntentCodeNode.jsonContent as any)?.path

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
    var dirSourceNode: SourceNode = projectDotIntentCodeNode

    for (const dir of dirs) {

      if (dir.length === 0) {
        break
      }

      dirSourceNode = await
        dotIntentCodeGraphMutateService.getOrCreateDotIntentCodeDir(
          prisma,
          projectDotIntentCodeNode.instanceId,
          dirSourceNode,
          dir)
    }

    // Get/create nodes for the filename
    const filenameSourceNode = await
            dotIntentCodeGraphMutateService.getOrCreateConfigFile(
              prisma,
              projectDotIntentCodeNode.instanceId,
              dirSourceNode,
              fileSourceNodeType,
              filename,
              relativePath)

    // Return filename's node
    return filenameSourceNode
  }
}
