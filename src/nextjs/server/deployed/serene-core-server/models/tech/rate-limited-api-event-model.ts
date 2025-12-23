import { PrismaClient } from '@prisma/client'

export class RateLimitedApiEventModel {

  // Consts
  clName = 'RateLimitedApiEventModel'

  // Code
  async create(prisma: PrismaClient,
               id: string | undefined,
               rateLimitedApiId: string,
               userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.rateLimitedApiEvent.create({
        data: {
          id: id,
          rateLimitedApiId: rateLimitedApiId,
          userProfileId: userProfileId
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
    var rateLimitedApiEvent: any = undefined

    try {
      rateLimitedApiEvent = await
        prisma.rateLimitedApiEvent.findUnique({
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
    return rateLimitedApiEvent
  }

  async getWaitSecondsSinceLastSpecifiedMinutes(
          prisma: PrismaClient,
          lastMinutes: number = 1) {

    const fnName = `${this.clName}.getWaitSecondsSinceLastSpecifiedMinutes()`

    // Get time to check from
    var xMinutesAgoInUtc = new Date()
    xMinutesAgoInUtc.setUTCMinutes(xMinutesAgoInUtc.getUTCMinutes() - 1)

    // Get first record in window
    var rateLimitedApiEvent: any

    try {
      rateLimitedApiEvent = await prisma.rateLimitedApiEvent.findFirst({
        where: {
          created: {
            gte: xMinutesAgoInUtc
          }
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }

    // console.log(`${fnName}: rateLimitedApiEvent: ` +
    //             JSON.stringify(rateLimitedApiEvent))

    if (rateLimitedApiEvent == null) {
      return null
    }

    // Get diff in seconds and return the time to go
    var utc = new Date()
    utc.setUTCMinutes(utc.getUTCMinutes())

    return (lastMinutes * 60) -
              Math.trunc(
                (utc.getTime() -
                rateLimitedApiEvent.created.getTime()) / 1000)
  }

  async getUserSentForLastSpecifiedMinutes(
          prisma: PrismaClient,
          lastMinutes: number) {

    const fnName = `${this.clName}.getForLastSpecifiedMinutes()`

    // Get time to check from
    var xMinutesAgoInUtc = new Date()
    xMinutesAgoInUtc.setUTCMinutes(xMinutesAgoInUtc.getUTCMinutes() - 1)

    // Count records
    try {
      return await prisma.rateLimitedApiEvent.count({
        where: {
          created: {
            gte: xMinutesAgoInUtc
          }
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async update(prisma: PrismaClient,
               id: string,
               rateLimitedApiId: string,
               userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Update record
    try {
      return await prisma.rateLimitedApiEvent.update({
        data: {
          rateLimitedApiId: rateLimitedApiId,
          userProfileId: userProfileId
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
               rateLimitedApiId: string,
               userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If the id is specified, try to get it
    if (id != null) {

      const rateLimitedApiEvent = await
              this.getById(
                prisma,
                id)

      if (rateLimitedApiEvent != null) {
        id = rateLimitedApiEvent.id
      }
    }

    // Upsert
    if (id == null) {

      return await this.create(
                     prisma,
                     id,
                     rateLimitedApiId,
                     userProfileId)
    } else {

      return await this.update(
                     prisma,
                     id,
                     rateLimitedApiId,
                     userProfileId)
    }
  }
}
