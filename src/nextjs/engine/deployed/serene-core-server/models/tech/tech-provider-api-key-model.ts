import { PrismaClient } from '@prisma/client'
import { CustomError } from '../../types/errors'

export class TechProviderApiKeyModel {

  // Consts
  clName = 'TechProviderApiKeyModel'

  // Code
  async create(
          prisma: PrismaClient,
          techProviderId: string,
          status: string,
          name: string,
          accountEmail: string,
          apiKey: string,
          pricingTier: string | null) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.techProviderApiKey.create({
        data: {
          techProviderId: techProviderId,
          status: status,
          name: name,
          accountEmail: accountEmail,
          apiKey: apiKey,
          pricingTier: pricingTier
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
          accountEmail: string | undefined,
          pricingTier: string | null | undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // console.log(`${fnName}: starting..`)

    // Query
    var techProvider: any = null

    try {
      techProvider = await prisma.techProviderApiKey.findMany({
        where: {
          techProviderId: techProviderId,
          status: status,
          pricingTier: pricingTier
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return
    return techProvider
  }

  async getById(prisma: PrismaClient,
                id: string) {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Validate
    if (id == null) {
      throw new CustomError(`${fnName}: id == null`)
    }

    // Query
    var techProvider: any = null

    try {
      techProvider = await prisma.techProviderApiKey.findUnique({
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
    return techProvider
  }

  async getByUniqueKey(
          prisma: PrismaClient,
          techProviderId: string,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Validate
    if (techProviderId == null) {
      throw new CustomError(`${fnName}: techProviderId == null`)
    }

    if (name == null) {
      throw new CustomError(`${fnName}: name == null`)
    }

    // Query
    var techProvider: any = null

    try {
      techProvider = await prisma.techProviderApiKey.findFirst({
        where: {
          techProviderId: techProviderId,
          name: name
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return
    return techProvider
  }

  async update(
          prisma: PrismaClient,
          id: string,
          techProviderId: string | undefined,
          status: string | undefined,
          name: string | undefined,
          accountEmail: string | undefined,
          apiKey: string | undefined,
          pricingTier: string | null | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Create record
    try {
      return await prisma.techProviderApiKey.update({
        data: {
          techProviderId: techProviderId,
          status: status,
          name: name,
          accountEmail: accountEmail,
          apiKey: apiKey,
          pricingTier: pricingTier
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
               name: string | undefined,
               accountEmail: string | undefined,
               apiKey: string | undefined,
               pricingTier: string | null | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If id isn't specified, try to get by the unique key
    if (id == null &&
        techProviderId != null &&
        name != null) {

      const tech = await
              this.getByUniqueKey(
                prisma,
                techProviderId,
                name)

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

      if (name == null) {
        console.error(`${fnName}: id is null and name is null`)
        throw 'Prisma error'
      }

      if (accountEmail === undefined) {
        console.error(`${fnName}: id is null and accountEmail is undefined`)
        throw 'Prisma error'
      }

      if (apiKey == null) {
        console.error(`${fnName}: id is null and apiKey is null`)
        throw 'Prisma error'
      }

      if (pricingTier === undefined) {
        console.error(`${fnName}: id is null and pricingTier is undefined`)
        throw 'Prisma error'
      }

      // Create
      // console.log(`${fnName}: create..`)

      return await
               this.create(
                 prisma,
                 techProviderId,
                 status,
                 name,
                 accountEmail,
                 apiKey,
                 pricingTier)
    } else {

      // Update
      // console.log(`${fnName}: update..`)

      return await
               this.update(
                 prisma,
                 id,
                 techProviderId,
                 status,
                 name,
                 accountEmail,
                 apiKey,
                 pricingTier)
    }
  }
}
