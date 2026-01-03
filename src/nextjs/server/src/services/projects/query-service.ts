const NodeCache = require('node-cache')
import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { InstanceModel } from '@/serene-core-server/models/instances/instance-model'
import { InstanceSettingModel } from '@/serene-core-server/models/instances/instance-setting-model'
import { UsersService } from '@/serene-core-server/services/users/service'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { InstanceSettingNames, ServerOnlyTypes } from '@/types/server-only-types'

// Cache objects must be global, to access all data (e.g. ability to delete
// an item from an object if InstanceService).
const cachedInstances = new NodeCache()
const cachedInstancesWithIncludes = new NodeCache()

// Models
const instanceModel = new InstanceModel()
const instanceSettingModel = new InstanceSettingModel()

// Services
const usersService = new UsersService()

// Class
export class ProjectsQueryService {

  // Consts
  clName = 'ProjectsQueryService'

  // Code
  async getProject(
          prisma: PrismaClient,
          projectName: string) {

    // Debug
    const fnName = `${this.clName}.getSystemProject()`

    // Get the admin UserProfile
    const adminUserProfile = await
            usersService.getUserProfileByEmail(
              prisma,
              ServerTestTypes.adminUserEmail)

    if (adminUserProfile == null) {
      throw new CustomError(`${fnName}: UserProfile not found for email: ` +
                            ServerTestTypes.adminUserEmail)
    }

    // Get the System project
    const project = await
            instanceModel.getByParentIdAndNameAndUserProfileId(
              prisma,
              null,  // parentId
              projectName,
              adminUserProfile.id)

    // Return
    return project
  }

  async getProjectByPath(
          prisma: PrismaClient,
          fullPath: string) {

    // Get project's path
    const projectPaths = await
            instanceSettingModel.filter(
              prisma,
              undefined,  // instanceId
              InstanceSettingNames.projectPath,
              undefined)  // value

    // Matching
    for (const projectPath of projectPaths) {

      if (fullPath.startsWith(projectPath.value)) {

        // Get instance
        const instance = await
                instanceModel.getById(
                  prisma,
                  projectPath.instanceId)

        // Return instance
        return instance
      }
    }

    // Not found
    return null
  }
}
