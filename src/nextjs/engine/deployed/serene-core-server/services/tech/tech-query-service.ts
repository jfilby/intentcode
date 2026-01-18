import { PrismaClient, Tech } from '@prisma/client'
import { CustomError } from '../../types/errors'
import { SereneCoreServerTypes } from '../../types/user-types'
import { TechModel } from '../../models/tech/tech-model'

// Models
const techModel = new TechModel()

// Class
export class TechQueryService {

  // Consts
  clName = 'TechQueryService'

  // Code
  async getTechByEnvKey(
          prisma: PrismaClient,
          envKey: string) {

    // Debug
    const fnName = `${this.clName}.getTechByEnvKey()`

    // Validate
    if (envKey == null ||
        envKey.length === 0) {

      throw new CustomError(`${fnName}: envKey not specified`)
    }

    // Get and validate env var
    const variantName = process.env[envKey]

    // Validate
    if (variantName == null ||
        variantName === '') {

      throw new CustomError(`${fnName}: envKey: ${envKey} not found`)
    }

    // Get the standard LLM to use
    const tech = await
            techModel.getByVariantName(
              prisma,
              variantName)

    // Validate
    if (tech == null) {
      throw new CustomError(`${fnName}: tech == null for variantName: ` +
                            `${variantName}`)
    }

    // Return
    return tech
  }

  async getTechs(
          prisma: PrismaClient,
          userProfile: any,
          resource: string) {

    // Determine isAdminOnly
    var isAdminOnly: boolean | undefined = false

    if (userProfile.isAdmin === true) {
      isAdminOnly = undefined
    }

    // Filter
    var techs = await
          techModel.filter(
            prisma,
            undefined,  // techProviderId
            SereneCoreServerTypes.activeStatus,
            resource,
            undefined,  // model
            undefined,  // protocol
            isAdminOnly)

    // Remove free tech if not an admin
    if (userProfile.isAdmin === false) {

      techs =
        techs.filter((tech: Tech) =>
          tech.pricingTier !== SereneCoreServerTypes.free)
    }

    // Return
    return {
      status: true,
      techs: techs
    }
  }
}
