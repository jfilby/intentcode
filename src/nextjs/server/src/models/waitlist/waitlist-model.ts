export class WaitlistModel {

  // Consts
  clName = 'WaitlistModel'

  // Code
  async create(
          prisma: any,
          email: string) {

    // Debug
    const fnName = `${this.clName}.create()`

    // Create record
    try {
      return await prisma.waitlist.create({
        data: {
          email: email
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async deleteById(
          prisma: any,
          id: string) {

    // Debug
    const fnName = `${this.clName}.deleteById()`

    // Delete
    try {
      return await prisma.waitlist.delete({
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
          prisma: any,
          email: string | undefined) {

    // Debug
    const fnName = `${this.clName}.filter()`

    // Query
    try {
      return await prisma.waitlist.findMany({
        where: {
          email: email
        }
      })
    } catch(error: any) {
      console.error(`${fnName}: error: ${error}`)
      throw 'Prisma error'
    }
  }

  async getById(
          prisma: any,
          id: string) {

    // Debug
    const fnName = `${this.clName}.getById()`

    // Query
    var waitlist: any = null

    try {
      waitlist = await prisma.waitlist.findUnique({
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
    return waitlist
  }

  async getByEmail(
          prisma: any,
          email: string) {

    // Debug
    const fnName = `${this.clName}.getByEmail()`

    // Validate
    if (email == null) {
      console.error(`${fnName}: email == null`)
      throw 'Validation error'
    }

    // Query
    var waitlist: any = null

    try {
      waitlist = await prisma.waitlist.findFirst({
        where: {
          email: email
        }
      })
    } catch(error: any) {
      if (!(error instanceof error.NotFound)) {
        console.error(`${fnName}: error: ${error}`)
        throw 'Prisma error'
      }
    }

    // Return
    return waitlist
  }

  async update(
          prisma: any,
          id: string,
          email: string) {

    // Debug
    const fnName = `${this.clName}.update()`

    // Update record
    try {
      return await prisma.waitlist.update({
        data: {
          email: email
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

  async upsert(prisma: any,
               id: string | undefined,
               email: string) {

    // Debug
    const fnName = `${this.clName}.upsert()`

    // If id is null and email isn't null, try to get an existing record, to
    // get the id.
    if (id == null &&
        email != null) {

      const waitlist = await
              this.getByEmail(
                prisma,
                email)

      if (waitlist != null) {

        id = waitlist.id
      }
    }

    // Upsert
    if (id == null) {

      // Validate for create (mainly for type validation of the create call)
      if (email == null) {
        console.error(`${fnName}: id is null and email is null`)
        throw 'Prisma error'
      }

      // Create
      return await
               this.create(
                 prisma,
                 email)
    } else {

      // Update
      return await
               this.update(
                 prisma,
                 id,
                 email)
    }
  }
}
