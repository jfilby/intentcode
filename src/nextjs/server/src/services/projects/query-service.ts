const NodeCache = require('node-cache')
import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { InstanceModel } from '@/serene-core-server/models/instances/instance-model'
import { UsersService } from '@/serene-core-server/services/users/service'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { ServerOnlyTypes } from '@/types/server-only-types'

// Cache objects must be global, to access all data (e.g. ability to delete
// an item from an object if InstanceService).
const cachedInstances = new NodeCache()
const cachedInstancesWithIncludes = new NodeCache()

// Models
const instanceModel = new InstanceModel()

// Services
const usersService = new UsersService()

// Class
export class ProjectsQueryService {

  // Consts
  clName = 'ProjectsQueryService'

  // Code
  async getLocalProject(prisma: PrismaClient) {

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
              ServerOnlyTypes.localProjectName,
              adminUserProfile.id)

    // Return
    return project
  }
}
