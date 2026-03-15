import NodeCache from 'node-cache'
import { InstanceModel, InstanceSettingModel } from 'serene-core-server'
import { PrismaClient } from '@/prisma/client.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { InstanceSettingNames, ServerOnlyTypes } from '@/types/server-only-types.js'
import { ProjectsQueryService } from './query-service.js'

// Cache objects must be global, to access all data (e.g. ability to delete
// an item from an object if InstanceService).
const cachedInstances = new NodeCache()
const cachedInstancesWithIncludes = new NodeCache()

// Models
const instanceModel = new InstanceModel()
const instanceSettingModel = new InstanceSettingModel()

// Services
const projectsQueryService = new ProjectsQueryService()

// Class
export class ProjectsMutateService {

  // Consts
  clName = 'ProjectsMutateService'

  // Code
  async getOrCreate(
          prisma: PrismaClient,
          userProfileId: string,
          projectName: string) {

    // Validate
    const validationResults = await
      projectsQueryService.validate(
        prisma,
        userProfileId,
        projectName)

    if (validationResults.status === false) {
      return {
        status: false,
        message: validationResults.message,
        instance: undefined
      }
    }

    if (validationResults.key == null ||
        validationResults.name == null) {
      return {
        status: false,
        message: `Internal error trying to validate project name`,
        instance: undefined
      }
    }

    // Create the project
    const project = await
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
        validationResults.key,
        validationResults.name)

    // Return
    return {
      status: true,
      instance: project
    }
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
    const validationResults = await
      projectsQueryService.validate(
        prisma,
        userProfileId,
        name)

    if (validationResults.status === false) {
      return validationResults
    }

    if (validationResults.key == null ||
        validationResults.name == null) {
      return {
        status: false,
        message: `Internal error trying to validate project name`,
        instance: undefined
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
          message: `You can't update a project you didn't create.`,
          instance: undefined
        }
      }

      // Can't update if this is a demo instance
      if (projectInstance.isDemo === true) {

        return {
          status: false,
          message: `This project isn't of a type you can update.`,
          instance: undefined
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
        validationResults.key,
        validationResults.name)

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
      instance: projectInstance
    }
  }
}
