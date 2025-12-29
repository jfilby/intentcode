import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'

export class SourceNodeModel {

  // Consts
  clName = 'SourceNodeModel'

  // Code
  async create(
          prisma: PrismaClient,
          parentId: string | null,
          instanceId: string,
          status: string,
          type: string,
          path: string | null,
          name: string,
          content: string | null,
          contentHash: string | null,
          jsonContent: any,
          jsonContentHash: string | null) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Validate
    if (name == null) {
      throw new CustomError(`${fnName}: name == null`)
    }

    if (name.length == 0) {
      throw new CustomError(`${fnName}: name.length == 0`)
    }

    // Create record
    try {
      return await prisma.sourceNode.create({
        data: {
          parentId: parentId,
          instanceId: instanceId,
          status: status,
          type: type,
          path: path,
          name: name,
          content: content,
          contentHash: contentHash,
          jsonContent: jsonContent,
          jsonContentHash: jsonContentHash
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
      return await prisma.sourceNode.delete({
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
          parentId: string | null | undefined = undefined,
          instanceId: string | undefined = undefined,
          type: string | undefined = undefined,
          name: string | undefined = undefined,
          contentHash: string | null | undefined = undefined,
          jsonContentHash: string | null | undefined = undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Query
    try {
      return await prisma.sourceNode.findMany({
        where: {
          parentId: parentId,
          instanceId: instanceId,
          type: type,
          name: name,
          contentHash: contentHash,
          jsonContentHash: jsonContentHash
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
    var sourceNode: any = null

    try {
      sourceNode = await prisma.sourceNode.findUnique({
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
    return sourceNode
  }

  async getByUniqueKey(
          prisma: PrismaClient,
          parentId: string | null,
          instanceId: string,
          type: string,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getByUniqueKey()`

    // Validate
    if (parentId === undefined) {
      console.error(`${fnName}: parentId === undefined`)
      throw 'Validation error'
    }

    if (instanceId == null) {
      console.error(`${fnName}: instanceId == null`)
      throw 'Validation error'
    }

    if (type == null) {
      console.error(`${fnName}: type == null`)
      throw 'Validation error'
    }

    if (name == null) {
      console.error(`${fnName}: name == null`)
      throw 'Validation error'
    }

    // Query
    var sourceNode: any = null

    try {
      sourceNode = await prisma.sourceNode.findFirst({
        where: {
          parentId: parentId,
          instanceId: instanceId,
          type: type,
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
    return sourceNode
  }

  async update(
          prisma: PrismaClient,
          id: string,
          parentId: string | null | undefined,
          instanceId: string | undefined,
          status: string | undefined,
          type: string | undefined,
          path: string | null | undefined,
          name: string | undefined,
          content: string | null | undefined,
          contentHash: string | null | undefined,
          jsonContent: any | undefined,
          jsonContentHash: string | null | undefined) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Validate
    if (name == null) {
      throw new CustomError(`${fnName}: name == null`)
    }

    if (name.length == 0) {
      throw new CustomError(`${fnName}: name.length == 0`)
    }

    // Update record
    try {
      return await prisma.sourceNode.update({
        data: {
          parentId: parentId,
          instanceId: instanceId,
          status: status,
          type: type,
          path: path,
          name: name,
          content: content,
          contentHash: contentHash,
          jsonContent: jsonContent,
          jsonContentHash: jsonContentHash
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
          parentId: string | null | undefined,
          instanceId: string | undefined,
          status: string | undefined,
          type: string | undefined,
          path: string | null | undefined,
          name: string | undefined,
          content: string | null | undefined,
          contentHash: string | null | undefined,
          jsonContent: any | undefined,
          jsonContentHash: string | null | undefined) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // console.log(`${fnName}: starting with id: ` + JSON.stringify(id))

    // If id isn't specified, but the unique keys are, try to get the record
    if (id == null &&
        parentId !== undefined &&
        instanceId !== undefined &&
        type != null &&
        name != null) {

      const sourceNode = await
              this.getByUniqueKey(
                prisma,
                parentId,
                instanceId,
                type,
                name)

      if (sourceNode != null) {
        id = sourceNode.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (parentId == undefined) {
        console.error(`${fnName}: id is null and parentId is undefined`)
        throw 'Prisma error'
      }

      if (instanceId === undefined) {
        console.error(`${fnName}: id is null and instanceId is undefined`)
        throw 'Prisma error'
      }

      if (status == null) {
        console.error(`${fnName}: id is null and status is null`)
        throw 'Prisma error'
      }

      if (type == null) {
        console.error(`${fnName}: id is null and type is null`)
        throw 'Prisma error'
      }

      if (path === undefined) {
        console.error(`${fnName}: id is null and path is undefined`)
        throw 'Prisma error'
      }

      if (name == null) {
        console.error(`${fnName}: id is null and name is null`)
        throw 'Prisma error'
      }

      if (content == undefined) {
        console.error(`${fnName}: id is null and content is undefined`)
        throw 'Prisma error'
      }

      if (contentHash == undefined) {
        console.error(`${fnName}: id is null and contentHash is undefined`)
        throw 'Prisma error'
      }

      if (jsonContent === undefined) {
        console.error(`${fnName}: id is null and jsonContent is undefined`)
        throw 'Prisma error'
      }

      if (jsonContentHash === undefined) {
        console.error(`${fnName}: id is null and jsonContentHash is undefined`)
        throw 'Prisma error'
      }

      // Create
      return await
               this.create(
                 prisma,
                 parentId,
                 instanceId,
                 status,
                 type,
                 path,
                 name,
                 content,
                 contentHash,
                 jsonContent,
                 jsonContentHash)
    } else {

      // Update
      return await
               this.update(
                 prisma,
                 id,
                 parentId,
                 instanceId,
                 status,
                 type,
                 path,
                 name,
                 content,
                 contentHash,
                 jsonContent,
                 jsonContentHash)
    }
  }
}
