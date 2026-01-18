import { PrismaClient } from '@prisma/client'
import { CustomError } from '../../types/errors'
import { UserPreferenceModel } from '../../models/users/user-preference-model'

export class UserPreferenceService {

  // Consts
  clName = 'UserPreferenceService'

  zipCountries = [ 'Philippines',
                   'United States' ]

  // Models
  userPreferenceModel = new UserPreferenceModel()

  // Code
  async createIfNotExists(
          prisma: PrismaClient,
          userProfileId: string,
          category: string,
          key: string,
          value: string | null,
          values: string[] | null) {

    // console.log('createIfNotExists()')

    // Find if exists
    const userPreference = await
            this.userPreferenceModel.getByUniqueKey(
              prisma,
              userProfileId,
              key)

    if (userPreference != null) {
      return
    }

    // Create (doesn't exist yet)
    await this.userPreferenceModel.create(
            prisma,
            userProfileId,
            category,
            key,
            value,
            values)
  }

  async delete(
          prisma: PrismaClient,
          userProfileId: string,
          category: string,
          key: string) {

    // Debug
    const fnName = `${this.clName}.delete()`

    // Try to get the record
    const userPreference = await
            this.userPreferenceModel.getByUniqueKey(
              prisma,
              userProfileId,
              key)

    if (userPreference == null) {
      return
    }

    // Validate category is as expected
    if (category != null &&
        userPreference.category !== category) {

      throw new CustomError(`${fnName}: userPreference.category !== category`)
    }

    // Delete the record
    await this.userPreferenceModel.deleteById(
            prisma,
            userPreference.id)
  }

  async getUserPreferences(
          prisma: PrismaClient,
          userProfileId: string,
          category: string,
          keys: string[]) {

    // Get user preferences
    var userPreferences: any[] = []

    if (keys != null) {
      
      userPreferences = await
        this.userPreferenceModel.filterManyKeys(
          prisma,
          userProfileId,
          keys)
    } else {

      userPreferences = await
        this.userPreferenceModel.filter(
          prisma,
          userProfileId,
          category,
          undefined)  // key
    }

    // Return
    return userPreferences
  }
}
