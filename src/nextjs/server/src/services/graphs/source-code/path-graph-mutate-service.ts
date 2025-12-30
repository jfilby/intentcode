import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { FsUtilsService } from '../../utils/fs-utils-service'
import { SourceCodeGraphMutateService } from './graph-mutate-service'

// Services
const fsUtilsService = new FsUtilsService()
const sourceCodeGraphMutateService = new SourceCodeGraphMutateService()

// Class
export class SourceCodePathGraphMutateService {

  // Consts
  clName = 'SourceCodePathGraphMutateService'

  // Code
  async getOrCreateSourceCodePathAsGraph(
          prisma: PrismaClient,
          projectSourceNode: SourceNode,
          fullPath: string,
          content: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSourceCodePathAsGraph()`

    // Get project source path
    const projectSourcePath = (projectSourceNode.jsonContent as any)?.path

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
    var dirSourceNode: SourceNode = projectSourceNode

    for (const dir of dirs) {

      if (dir.length === 0) {
        break
      }

      dirSourceNode = await
        sourceCodeGraphMutateService.getOrCreateSourceCodeDir(
          prisma,
          projectSourceNode.instanceId,
          dirSourceNode,
          dir)
    }

    // Get/create nodes for the filename
    const filenameSourceNode = await
            sourceCodeGraphMutateService.getOrCreateSourceCodeFile(
              prisma,
              projectSourceNode.instanceId,
              dirSourceNode,
              filename,
              content)

    // Return filename's node
    return filenameSourceNode
  }
}
