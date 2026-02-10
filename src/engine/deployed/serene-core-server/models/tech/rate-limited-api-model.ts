import { PrismaClient } from '@prisma/client'

export class RateLimitedApiModel {

  // Consts
  clName = 'RateLimitedApiModel'

  // Code
  async create(prisma: PrismaClient,
               id: string | undefined,
               techId: string,
               ratePerMinute: number) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.rateLimitedApi.create({
        data: {
          id: id,
          techId: techId,
          ratePerMinute: ratePerMinute
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async getById(prisma: PrismaClient,
                id: string) {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Query record
    var rateLimitedApi: any = undefined

    try {
      rateLimitedApi = await
        prisma.rateLimitedApi.findUnique({
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

    // Return OK
    return rateLimitedApi
  }

  async getByTechId(
          prisma: PrismaClient,
          techId: string) {

    // Debug
    const fnName = `${this.clName}.getByTechId()`

    // Validate
    if (techId == null) {
      console.error(`${fnName}: id is null and techId is null`)
      throw 'Prisma error'
    }

    // Query record
    var rateLimitedApi: any = undefined

    try {
      rateLimitedApi = await
        prisma.rateLimitedApi.findFirst({
          where: {
            techId: techId
          }
        })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)

      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return OK
    return rateLimitedApi
  }

  async update(prisma: PrismaClient,
               id: string,
               techId: string,
               ratePerMinute: number) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Update record
    try {
      return await prisma.rateLimitedApi.update({
        data: {
          techId: techId,
          ratePerMinute: ratePerMinute
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
               techId: string,
               ratePerMinute: number) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If the id is specified, try to get it
    if (id != null) {

      const rateLimitedApi = await
              this.getById(
                prisma,
                id)

      if (rateLimitedApi != null) {
        id = rateLimitedApi.id
      }
    }

    // Try to get by unique key
    if (id == null) {

      const rateLimitedApi = await
              this.getByTechId(
                prisma,
                techId)

      if (rateLimitedApi != null) {
        id = rateLimitedApi.id
      }
    }

    // Upsert
    if (id == null) {

      return await this.create(
                     prisma,
                     id,
                     techId,
                     ratePerMinute)
    } else {

      return await this.update(
                     prisma,
                     id,
                     techId,
                     ratePerMinute)
    }
  }
}
