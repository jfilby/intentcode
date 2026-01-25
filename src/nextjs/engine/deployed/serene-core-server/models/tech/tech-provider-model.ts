import { PrismaClient } from '@prisma/client'
import { CustomError } from '../../types/errors'

export class TechProviderModel {

  // Consts
  clName = 'TechProviderModel'

  // Code
  async create(
          prisma: PrismaClient,
          status: string,
          name: string,
          baseUrl: string | null,
          provides: string[]) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.techProvider.create({
        data: {
          status: status,
          name: name,
          baseUrl: baseUrl,
          provides: provides
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async filter(
          prisma: PrismaClient,
          status: string | undefined,
          provides: string[] | undefined = undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // console.log(`${fnName}: starting..`)

    // Query
    var techProvider: any = null

    try {
      techProvider = await prisma.techProvider.findMany({
        where: {
          status: status,
          provides: provides ? {
            hasEvery: provides
          } : undefined
        },
        orderBy: [
          {
            name: 'asc'
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
      techProvider = await prisma.techProvider.findUnique({
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

  async getByName(
          prisma: PrismaClient,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getByName()`

    // console.log(`${fnName}: name: ${name}`)

    // Validate
    if (name == null) {
      console.error(`${fnName}: id is null and name is null`)
      throw 'Prisma error'
    }

    // Query
    var techProvider: any = null

    try {
      techProvider = await prisma.techProvider.findFirst({
        where: {
          name: name
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // console.log(`${fnName}: techProvider: ${JSON.stringify(techProvider)}`)

    // Return
    return techProvider
  }

  async update(
          prisma: PrismaClient,
          id: string,
          status: string | undefined,
          name: string | undefined,
          baseUrl: string | null | undefined,
          provides: string[] | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Create record
    try {
      return await prisma.techProvider.update({
        data: {
          status: status,
          name: name,
          baseUrl: baseUrl,
          provides: provides
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
               status: string | undefined,
               name: string | undefined,
               baseUrl: string | null | undefined,
               provides: string[] | undefined = undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If id isn't specified, try to get by name
    if (id == null &&
        name != null) {

      const techProvider = await
              this.getByName(
                prisma,
                name)

      if (techProvider != null) {
        id = techProvider.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (status == null) {
        console.error(`${fnName}: id is null and status is null`)
        throw 'Prisma error'
      }

      if (name == null) {
        console.error(`${fnName}: id is null and name is null`)
        throw 'Prisma error'
      }

      if (baseUrl === undefined) {
        console.error(`${fnName}: id is null and baseUrl is undefined`)
        throw 'Prisma error'
      }

      if (provides == null) {
        console.error(`${fnName}: id is null and provides is null`)
        throw 'Prisma error'
      }

      // Create
      // console.log(`${fnName}: create..`)

      return await
               this.create(
                 prisma,
                 status,
                 name,
                 baseUrl,
                 provides)
    } else {

      // Update
      // console.log(`${fnName}: update..`)

      return await
               this.update(
                 prisma,
                 id,
                 status,
                 name,
                 baseUrl,
                 provides)
    }
  }
}
