import { PrismaClient, SourceNode } from '@prisma/client'
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
          projectNode: SourceNode) {

    // Load any new extensions
    await projectSetupService.loadDepsConfigFile(
            prisma,
            projectNode)

    // Update and write the package manager file
    await sourceDepsFileService.updateAndWriteFile(
            prisma,
            projectNode)
  }
}
