import { PrismaClient, SourceNode } from '@prisma/client'
import { GraphQueryService } from '@/services/graphs/intentcode/graph-query-service'
import { ReadJsTsSourceImportsService } from '@/services/source-code/imports/read-js-ts-service'
import { CustomError } from '@/serene-core-server/types/errors'

// Services
const graphQueryService = new GraphQueryService()
const readJsTsSourceImportsService = new ReadJsTsSourceImportsService()

// Class
export class PackageJsonManagedFileService {

  // Consts
  clName = 'PackageJsonManagedFileService'

  // Code
  async updateAndWriteFile(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.writeFile()`

    // Get projectSourceNode
    const projectSourceNode = await
            graphQueryService.getProjectSourceNode(
              prisma,
              intentCodeProjectNode)

    // Validate
    if (projectSourceNode == null) {
      throw new CustomError(`${fnName}: projectSourceNode == null`)
    }

    // Get projectSourcePath
    const projectSourcePath = (projectSourceNode.jsonContent as any).path

    // Read in the existing file (if available)
    const importsData = await
            readJsTsSourceImportsService.run(
              prisma,
              projectSourcePath)

    // TEST STOP
    throw new CustomError(`${fnName}: TEST STOP`)

    // Get all dependency nodes
    ;

    // Update the contents
    ;

    // Write the contents
    ;
  }
}
