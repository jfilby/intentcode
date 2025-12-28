import { PrismaClient } from '@prisma/client'

export class SourceEdgeModel {

  // Consts
  clName = 'SourceEdgeModel'

  // Code
  async create(
          prisma: PrismaClient,
          fromId: string,
          toId: string,
          status: string,
          name: string) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.sourceEdge.create({
        data: {
          fromId: fromId,
          toId: toId,
          status: status,
          name: name
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw error
    }
  }

  async deleteById(
          prisma: PrismaClient,
          id: string) {

    // Debug
    const fnName = `${this.clName}.deleteById()`

    // Delete
    try {
      return await prisma.sourceEdge.delete({
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
  }

  async filter(
          prisma: PrismaClient,
          fromId: string | undefined = undefined,
          toId: string | undefined = undefined,
          status: string | undefined = undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Query
    try {
      return await prisma.sourceEdge.findMany({
        where: {
          fromId: fromId,
          toId: toId,
          status: status
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async getById(
          prisma: PrismaClient,
          id: string) {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Query
    var sourceEdge: any = null

    try {
      sourceEdge = await prisma.sourceEdge.findUnique({
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
    return sourceEdge
  }

  async getByUniqueKey(
          prisma: PrismaClient,
          fromId: string,
          toId: string,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getByUniqueKey()`

    // Validate
    if (fromId == null) {
      console.error(`${fnName}: fromId == null`)
      throw 'Validation error'
    }

    if (toId == null) {
      console.error(`${fnName}: toId == null`)
      throw 'Validation error'
    }

    if (name == null) {
      console.error(`${fnName}: name == null`)
      throw 'Validation error'
    }

    // Query
    var sourceEdge: any = null

    try {
      sourceEdge = await prisma.sourceEdge.findFirst({
        where: {
          fromId: fromId,
          toId: toId,
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
    return sourceEdge
  }

  async update(
          prisma: PrismaClient,
          id: string,
          fromId: string | undefined,
          toId: string | undefined,
          status: string | undefined,
          name: string | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Update record
    try {
      return await prisma.sourceEdge.update({
        data: {
          fromId: fromId,
          toId: toId,
          status: status,
          name: name
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

  async upsert(
          prisma: PrismaClient,
          id: string | undefined,
          fromId: string | undefined,
          toId: string | undefined,
          status: string | undefined,
          name: string | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // console.log(`${fnName}: starting with id: ` + JSON.stringify(id))

    // If id isn't specified, but the unique keys are, try to get the record
    if (id == null &&
        fromId != null &&
        toId != null &&
        name != null) {

      const sourceEdge = await
              this.getByUniqueKey(
                prisma,
                fromId,
                toId,
                name)

      if (sourceEdge != null) {
        id = sourceEdge.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (fromId == null) {
        console.error(`${fnName}: id is null and fromId is null`)
        throw 'Prisma error'
      }

      if (toId == null) {
        console.error(`${fnName}: id is null and toId is null`)
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

      // Create
      return await
               this.create(
                 prisma,
                 fromId,
                 toId,
                 status,
                 name)
    } else {

      // Update
      return await
               this.update(
                 prisma,
                 id,
                 fromId,
                 toId,
                 status,
                 name)
    }
  }
}
