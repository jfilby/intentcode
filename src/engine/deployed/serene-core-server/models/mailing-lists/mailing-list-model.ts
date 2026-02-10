import { PrismaClient } from '@prisma/client'

export class MailingListModel {

  // Consts
  clName = 'MailingListModel'

  // Code
  async create(
          prisma: PrismaClient,
          name: string,
          title: string) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Validate
    if (name == null) {
      console.error(`${fnName}: name == null`)
      throw 'Validation error'
    }

    if (title == null) {
      console.error(`${fnName}: title == null`)
      throw 'Validation error'
    }

    // Create record
    try {
      return await prisma.mailingList.create({
        data: {
          name: name,
          title: title
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async getAll(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.getAll()`

    // Query
    try {
      return await prisma.mailingList.findMany()
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
    var mailingList: any = null

    try {
      mailingList = await prisma.mailingList.findUnique({
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
    return mailingList
  }

  async getByName(
          prisma: PrismaClient,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getByKey()`

    // Validate
    if (name == null) {
      console.error(`${fnName}: name == null`)
      throw 'Validation error'
    }

    // Query
    var mailingList: any = null

    try {
      mailingList = await prisma.mailingList.findUnique({
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

    // Return
    return mailingList
  }

  async update(
          prisma: PrismaClient,
          id: string,
          name: string,
          title: string) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Update record
    try {
      return await prisma.mailingList.update({
        data: {
          name: name,
          title: title
        },
        where: {
          id: id
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${JSON.stringify(error)}`)
      throw 'Prisma error'
    }
  }

  async upsert(
          prisma: PrismaClient,
          id: string,
          name: string,
          title: string) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // Try to get an existing record
    if (name != null) {
      const mailingList = await
              this.getByName(
                prisma,
                name)

      if (mailingList != null) {
        id = mailingList.id
      }
    }

    if (id == null) {

      return await this.create(
                     prisma,
                     name,
                     title)
    } else {
      return await this.update(
                     prisma,
                     id,
                     name,
                     title)
    }
  }
}
