const NodeCache = require('node-cache')
import { PrismaClient } from '@prisma/client'
import { BaseDataTypes } from '@/types/base-data-types'
import { InstanceSettingNames, ServerOnlyTypes } from '@/types/server-only-types'
import { InstanceModel } from '@/serene-core-server/models/instances/instance-model'
import { InstanceSettingModel } from '@/serene-core-server/models/instances/instance-setting-model'

// Cache objects must be global, to access all data (e.g. ability to delete
// an item from an object if InstanceService).
const cachedInstances = new NodeCache()
const cachedInstancesWithIncludes = new NodeCache()

// Models
const instanceModel = new InstanceModel()
const instanceSettingModel = new InstanceSettingModel()

// Class
export class ProjectsMutateService {

  // Consts
  clName = 'ProjectsMutateService'

  // Code
  async getOrCreate(
          prisma: PrismaClient,
          userProfileId: string,
          projectName: string) {

    // Try to get project
    var project = await
          instanceModel.getByParentIdAndNameAndUserProfileId(
            prisma,
            null,  // parentId
            projectName,
            userProfileId)

    if (project != null) {
      return project
    }

    // Create the project
    project = await
      instanceModel.create(
        prisma,
        null,   // parentId
        userProfileId,
        ServerOnlyTypes.projectInstanceType,
        null,   // projectType
        false,  // isDemo
        false,  // isDefault
        BaseDataTypes.activeStatus,
        null,   // publicAccess
        projectName)

    // Return
    return project
  }

  async setProjectPath(
          prisma: PrismaClient,
          instanceId: string,
          path: string) {

    // Upsert
    const instanceSetting = await
            instanceSettingModel.upsert(
              prisma,
              undefined,  // id
              instanceId,
              InstanceSettingNames.projectPath,
              path)

    return instanceSetting
  }

  async upsert(
          prisma: PrismaClient,
          id: string | undefined,
          userProfileId: string,
          projectType: string | null,
          isDemo: boolean,
          isDefault: boolean,
          status: string,
          publicAccess: string | null,
          name: string) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // Validate
    if (name != null) {

      if (name.trim() === '') {
        return {
          status: false,
          message: `You must specify the name of the project.`
        }
      }
    }

    // Verification checks if the instance already exists
    var projectInstance: any

    if (id != null) {

      projectInstance = await
        instanceModel.getById(
          prisma,
          id)

      // Did the user create the instance?
      if (projectInstance.userProfileId !== userProfileId) {

        return {
          status: false,
          message: `You can't update a project you didn't create.`
        }
      }

      // Can't update if this is a demo instance
      if (projectInstance.isDemo === true) {

        return {
          status: false,
          message: `This project isn't of a type you can update.`
        }
      }
    }

    // Upsert the project instance record
    projectInstance = await
      instanceModel.upsert(
        prisma,
        id,
        null,       // parentId
        userProfileId,
        ServerOnlyTypes.projectInstanceType,
        projectType,
        isDemo,
        isDefault,
        status,
        publicAccess,
        // null,       // basePathDocNodeId
        // null,       // envVersionBranchId
        name)

    // Remove the project instance from the cache maps
    if (cachedInstances.has(projectInstance.id)) {
      cachedInstances.del(projectInstance.id)
    }

    if (cachedInstancesWithIncludes.has(projectInstance.id)) {
      cachedInstancesWithIncludes.del(projectInstance.id)
    }

    // Return OK
    return {
      status: true,
      instanceId: projectInstance.id
    }
  }
}
