import { PrismaClient } from '@prisma/client'
import { CustomError } from '../../types/errors'

export class TechModel {

  // Consts
  clName = 'TechModel'

  // Code
  async create(
          prisma: PrismaClient,
          techProviderId: string,
          status: string,
          variantName: string,
          resource: string,
          model: string | null,
          protocol: string | null,
          pricingTier: string,
          isDefaultProvider: boolean,
          isAdminOnly: boolean) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.tech.create({
        data: {
          techProviderId: techProviderId,
          status: status,
          variantName: variantName,
          resource: resource,
          model: model,
          protocol: protocol,
          pricingTier: pricingTier,
          isDefaultProvider: isDefaultProvider,
          isAdminOnly: isAdminOnly
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async filter(
          prisma: PrismaClient,
          techProviderId: string | undefined,
          status: string | undefined,
          resource: string | undefined,
          model: string | null | undefined,
          protocol: string | null | undefined,
          isAdminOnly: boolean | undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // console.log(`${fnName}: starting..`)

    // Query
    var tech: any = null

    try {
      tech = await prisma.tech.findMany({
        where: {
          techProviderId: techProviderId,
          status: status,
          resource: resource,
          model: model,
          protocol: protocol,
          isAdminOnly: isAdminOnly
        },
        orderBy: [
          {
            variantName: 'asc'
          }
        ]
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return
    return tech
  }

  async getById(
    prisma: PrismaClient,
    id: string,
    includeTechProvider: boolean = true) {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Validate
    if (id == null) {
      throw new CustomError(`${fnName}: id == null`)
    }

    // Query
    var tech: any = null

    try {
      tech = await prisma.tech.findUnique({
        include: {
          techProvider: includeTechProvider
        },
        where: {
          id: id
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return
    return tech
  }

  async getDefaultProvider(
    prisma: PrismaClient,
    resource: string,
    includeTechProvider: boolean = true) {

    // Debug
    const fnName = `${this.clName}.getByKey()`

    // console.log(`${fnName}: starting..`)

    // Query
    var tech: any = null

    try {
      tech = await prisma.tech.findFirst({
        include: {
          techProvider: includeTechProvider
        },
        where: {
          isDefaultProvider: true,
          resource: resource
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return
    return tech
  }

  async getByVariantName(
    prisma: PrismaClient,
    variantName: string,
    includeTechProvider: boolean = true) {

    // Debug
    const fnName = `${this.clName}.getByVariantName()`

    // console.log(`${fnName}: variantName: ${variantName}`)

    // Validate
    if (variantName == null) {
      console.error(`${fnName}: id is null and variantName is null`)
      throw 'Prisma error'
    }

    // Query
    var tech: any = null

    try {
      tech = await prisma.tech.findFirst({
        include: {
          techProvider: includeTechProvider
        },
        where: {
          variantName: variantName
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // console.log(`${fnName}: tech: ${JSON.stringify(tech)}`)

    // Return
    return tech
  }

  async update(
          prisma: PrismaClient,
          id: string,
          techProviderId: string | undefined,
          status: string | undefined,
          variantName: string | undefined,
          resource: string | undefined,
          model: string | null | undefined,
          protocol: string | null | undefined,
          pricingTier: string | undefined,
          isDefaultProvider: boolean | undefined,
          isAdminOnly: boolean | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Validate
    if (id == null) {
      throw new CustomError(`${fnName}: id == null for variantName: ` +
                            `${variantName}`)
    }

    // Update record
    try {
      return await prisma.tech.update({
        data: {
          techProviderId: techProviderId,
          status: status,
          variantName: variantName,
          resource: resource,
          model: model,
          protocol: protocol,
          pricingTier: pricingTier,
          isDefaultProvider: isDefaultProvider,
          isAdminOnly: isAdminOnly
        },
        where: {
          id: id
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async upsert(prisma: PrismaClient,
               id: string | undefined,
               techProviderId: string | undefined,
               status: string | undefined,
               variantName: string | undefined,
               resource: string | undefined,
               model: string | null | undefined,
               protocol: string | null | undefined,
               pricingTier: string | undefined,
               isDefaultProvider: boolean | undefined,
               isAdminOnly: boolean | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If id isn't specified, try to get by variantName
    if (id == null &&
        variantName != null) {

      const tech = await
              this.getByVariantName(
                prisma,
                variantName)

      if (tech != null) {
        id = tech.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (techProviderId == null) {
        console.error(`${fnName}: id is null and techProviderId is null`)
        throw 'Prisma error'
      }

      if (status == null) {
        console.error(`${fnName}: id is null and status is null`)
        throw 'Prisma error'
      }

      if (variantName == null) {
        console.error(`${fnName}: id is null and variantName is null`)
        throw 'Prisma error'
      }

      if (resource == null) {
        console.error(`${fnName}: id is null and resource is null`)
        throw 'Prisma error'
      }

      if (model === undefined) {
        console.error(`${fnName}: id is null and model is null`)
        throw 'Prisma error'
      }

      if (protocol === undefined) {
        console.error(`${fnName}: id is null and protocol is null`)
        throw 'Prisma error'
      }

      if (pricingTier == null) {
        console.error(`${fnName}: id is null and pricingTier is null`)
        throw 'Prisma error'
      }

      if (isDefaultProvider == null) {
        console.error(`${fnName}: id is null and isDefaultProvider is null`)
        throw 'Prisma error'
      }

      if (isAdminOnly == null) {
        console.error(`${fnName}: id is null and isAdminOnly is null`)
        throw 'Prisma error'
      }

      // Create
      // console.log(`${fnName}: create..`)

      return await
               this.create(
                 prisma,
                 techProviderId,
                 status,
                 variantName,
                 resource,
                 model,
                 protocol,
                 pricingTier,
                 isDefaultProvider,
                 isAdminOnly)
    } else {

      // Update
      // console.log(`${fnName}: update..`)

      return await
               this.update(
                 prisma,
                 id,
                 techProviderId,
                 status,
                 variantName,
                 resource,
                 model,
                 protocol,
                 pricingTier,
                 isDefaultProvider,
                 isAdminOnly)
    }
  }
}
