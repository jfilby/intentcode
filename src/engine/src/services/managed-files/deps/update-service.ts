import { PrismaClient, SourceNode } from '@prisma/client'
import { BuildData } from '@/types/build-types'
import { SourceDepsFileService } from './source-deps-service'
import { ProjectSetupService } from '@/services/projects/setup-project'

// Services
const projectSetupService = new ProjectSetupService()
const sourceDepsFileService = new SourceDepsFileService()

// Class
export class DepsUpdateService {

  // Consts
  clName = 'DepsUpdateService'

  // Code
  async update(
          prisma: PrismaClient,
          buildData: BuildData,
          projectNode: SourceNode) {

    // Load any new extensions
    await projectSetupService.loadDepsConfigFile(
            prisma,
            projectNode)

    // Update and write the package manager file
    await sourceDepsFileService.updateAndWriteFile(
            prisma,
            buildData,
            projectNode)
  }
}
