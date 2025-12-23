import { PrismaClient } from '@prisma/client'
import { CustomError } from '../../types/errors'
import { UserModel } from '../../models/users/user-model'
import { UserPreferenceModel } from '../../models/users/user-preference-model'
import { UserProfileModel } from '../../models/users/user-profile-model'
import { countries } from '../locale/countries'
import { UserPreferenceService } from '../user-preference/service'

interface ReqRes {
  req: any
  res: any
}

export class ProfileService {

  // Consts
  clName = 'ProfileService'

  // billingAddress = 'billing address'
  personalDetails = 'personal details'

  firstName = 'first name'
  fullName = 'full name'
  lastName = 'last name'        // For legacy compatibility with old Chargebee code in Serene Store
  countryCode = 'country code'
  /* billingNameAsMyName = 'billing name as my name'
  billingCountryAsMyCountry = 'billing country as my country'
  billingCountryCode = 'billing country code'
  billingFirstName = 'billing first name'
  billingLastName = 'billing last name'
  billingAddressLine1 = 'billing address line 1'
  billingAddressLine2 = 'billing address line 2'
  billingCity = 'billing city'
  billingState = 'billing state'
  billingZip = 'billing zip' */

  // Models
  userModel = new UserModel()
  userProfileModel = new UserProfileModel()
  userPreferenceModel = new UserPreferenceModel()

  // Code
  userPreferenceService = new UserPreferenceService()

  // Code
  async getAll(
    prisma: PrismaClient,
    userProfileId: string) {

    // Get userPreference records
    const userPreferences = await
      this.userPreferenceService.getUserPreferences(
        prisma,
        userProfileId,
        this.personalDetails,
        [ this.firstName,
          this.fullName,
          this.countryCode ])

    /* const userPreferences = await
      this.userPreferenceService.getUserPreferences(
        prisma,
        userProfileId,
        this.billingAddress,
        [ this.firstName,
          this.lastName,
          this.countryCode,
          this.billingNameAsMyName,
          this.billingCountryAsMyCountry,
          this.billingCountryCode,
          this.billingFirstName,
          this.billingLastName,
          this.billingAddressLine1,
          this.billingAddressLine2,
          this.billingCity,
          this.billingState,
          this.billingZip ]) */

    var userPreferenceMap: any[] = []

    for (const userPreference of userPreferences) {
      userPreferenceMap[userPreference.key] = userPreference
    }

    return userPreferenceMap
  }

  getCountryCodeByName(country: string): string | null {
    for (const countryIter of countries) {
      if (countryIter.name === country) {
        return countryIter.code
      }
    }

    return null
  }

  async update(
          prisma: PrismaClient,
          userProfileId: string,
          firstName: string,
          fullName: string,
          countryCode: string | null,
          /* billingNameAsMyName: string,
          billingCountryAsMyCountry: string,
          billingCountryCode: string,
          billingFirstName: string,
          billingLastName: string,
          billingAddressLine1: string,
          billingAddressLine2: string,
          billingCity: string,
          billingState: string,
          billingZip: string */) {

    // Get userPreference records
    const userPreferenceService: UserPreferenceService = new UserPreferenceService()

    // Upsert all records
    await this.userPreferenceModel.upsert(
            prisma,
            undefined,  // id
            userProfileId,
            this.personalDetails,
            this.firstName,
            firstName,
            null)

    await this.userPreferenceModel.upsert(
            prisma,
            undefined,  // id
            userProfileId,
            this.personalDetails,
            this.fullName,
            fullName,
            null)

    await this.userPreferenceModel.upsert(
            prisma,
            undefined,  // id
            userProfileId,
            this.personalDetails,
            this.countryCode,
            countryCode,
            null)

    /* await this.userPreferenceModel.upsert(
            prisma,
            undefined,  // id
            userProfileId,
            this.billingAddress,
            this.billingNameAsMyName,
            billingNameAsMyName.toString(),
            null)

    await this.userPreferenceModel.upsert(
            prisma,
            undefined,  // id
            userProfileId,
            this.billingAddress,
            this.billingCountryAsMyCountry,
            billingCountryAsMyCountry.toString(),
            null)

    await this.userPreferenceModel.upsert(
            prisma,
            undefined,  // id
            userProfileId,
            this.billingAddress,
            this.billingCountryCode,
            billingCountryCode,
            null)

    await this.userPreferenceModel.upsert(
            prisma,
            undefined,  // id
            userProfileId,
            this.billingAddress,
            this.billingFirstName,
            billingFirstName,
            null)

    await this.userPreferenceModel.upsert(
            prisma,
            undefined,  // id
            userProfileId,
            this.billingAddress,
            this.billingLastName,
            billingLastName,
            null)

    await this.userPreferenceModel.upsert(
            prisma,
            undefined,  // id
            userProfileId,
            this.billingAddress,
            this.billingAddressLine1,
            billingAddressLine1,
            null)

    await this.userPreferenceModel.upsert(
            prisma,
            undefined,  // id
            userProfileId,
            this.billingAddress,
            this.billingAddressLine2,
            billingAddressLine2,
            null)

    await this.userPreferenceModel.upsert(
            prisma,
            undefined,  // id
            userProfileId,
            this.billingAddress,
            this.billingCity,
            billingCity,
            null)

    await this.userPreferenceModel.upsert(
            prisma,
            undefined,  // id
            userProfileId,
            this.billingAddress,
            this.billingState,
            billingState,
            null)

    await this.userPreferenceModel.upsert(
            prisma,
            undefined,  // id
            userProfileId,
            this.billingAddress,
            this.billingZip,
            billingZip,
            null) */
  }

  async updateViaRestApi(
          { req, res }: ReqRes,
          prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.updateViaRestApi()`

    // Get body
    const body = req.body

    // Validate
    if (!body.userProfileId) {
      return res.status(200).json(
        {
          status: false,
          msg: 'UserProfileId was not found'
        })
    }

    if (!body.firstName) {
      return res.status(200).json(
        {
          status: false,
          msg: 'First name not specified'
        })
    }

    if (!body.fullName) {
      return res.status(200).json(
        {
          status: false,
          msg: 'Full name not specified'
        })
    }

    if (!body.country) {
      return res.status(200).json(
        {
          status: false,
          msg: 'Country not specified'
        })
    }

    /* if (!body.billingNameAsMyName) {
      return res.status(200).json(
        {
          status: false,
          msg: 'Billing name as my name not specified'
        })
    }

    if (!body.billingCountryAsMyCountry) {
      return res.status(200).json(
        {
          status: false,
          msg: 'Billing country as my country not specified'
        })
    }

    if (body.billingNameAsMyName === 'false' &&
      !body.billingFirstName) {
      return res.status(200).json(
        {
          status: false,
          msg: 'Billing first name not specified'
        })
    }

    if (body.billingNameAsMyName === 'false' &&
      !body.billingLastName) {
      return res.status(200).json(
        {
          status: false,
          msg: 'Billing last name not specified'
        })
    }

    if (body.billingCountryAsMyCountry === 'false' &&
      !body.billingCountry) {
      return res.status(200).json(
        {
          status: false,
          msg: 'Billing country not specified'
        })
    }

    if (!body.billingAddressLine1) {
      return res.status(200).json(
        {
          status: false,
          msg: 'Billing address line 1 not specified'
        })
    }

    if (!body.billingCity) {
      return res.status(200).json(
        {
          status: false,
          msg: 'Billing city not specified'
        })
    }

    if (!body.billingZip) {
      return res.status(200).json(
        {
          status: false,
          msg: 'Billing zip not specified'
        })
    }

    console.log(`.  body.zip: ${body.zip}`) */

    // Get UserProfile record
    const userProfile = await
            this.userProfileModel.getById(
              prisma,
              body.userProfileId)

    // Get country codes for countries
    const countryCode = this.getCountryCodeByName(body.country)
    // const billingCountryCode = this.getCountryCodeByName(body.billingCountry)

    // Update the user profile
    await this.update(
            prisma,
            body.userProfileId,
            body.firstName,
            body.fullName,
            countryCode,
            /* body.billingNameAsMyName,
            body.billingCountryAsMyCountry,
            billingCountryCode,
            body.billingFirstName,
            body.billingLastName,
            body.billingAddressLine1,
            body.billingAddressLine2,
            body.billingCity,
            body.billingState,
            body.billingZip */)

    // Validate
    if (userProfile == null) {
      throw new CustomError(`${fnName}: userProfile == null`)
    }

    if (userProfile.userId == null) {
      throw new CustomError(`${fnName}: userProfile.userId == null`)
    }

    // Update the User
    await this.userModel.update(
            prisma,
            userProfile.userId,
            undefined,  // email
            body.fullName)

    // Respond
    return res.status(200).json({
      status: true,
      msg: 'OK'
    })
  }

  async validateProfileCompleted(
          prisma: PrismaClient,
          forAction: string,
          userProfileId: string) {

    const userPreferences = await
            this.getAll(
              prisma,
              userProfileId)

    return this.validateRequiredFields(
             forAction,
             userPreferences)
  }

  validateRequiredFields(
    forAction: string,
    userPreferences: any) {

    // If for a scription, no fields are required (only the email sign-up)
    if (forAction === 'subscription') {
      return {
        status: true
      }
    }

    // Validate required fields
    if (!userPreferences[this.firstName]) {
      return {
        status: false,
        message: 'First name is missing for the user'
      }
    }

    if (!userPreferences[this.fullName]) {
      return {
        status: false,
        message: 'Full name is missing for the user'
      }
    }

    if (!userPreferences[this.countryCode]) {
      return {
        status: false,
        message: 'Country is missing for the user'
      }
    }

    /* if (!userPreferences[this.billingNameAsMyName]) {
      return {
        status: false,
        message: 'Billing name as my name checked (or not) is missing for the user'
      }
    }

    if (!userPreferences[this.billingCountryAsMyCountry]) {
      return {
        status: false,
        message: 'Billing country as my country checked (or not) is missing for the user'
      }
    }

    if (userPreferences[this.billingNameAsMyName] === 'false') {
      if (!userPreferences[this.billingFirstName]) {
        return {
          status: false,
          message: 'Billing first name is missing for the user'
        }
      }

      if (!userPreferences[this.billingLastName]) {
        return {
          status: false,
          message: 'Billing last name is missing for the user'
        }
      }
    }

    if (userPreferences[this.billingCountryAsMyCountry] === 'false') {
      if (!userPreferences[this.billingCountryCode]) {
        return {
          status: false,
          message: 'Billing country is missing for the user'
        }
      }
    }

    if (!userPreferences[this.billingAddressLine1]) {
      return {
        status: false,
        message: 'Billing address line 1 is missing for the user'
      }
    }

    if (!userPreferences[this.billingCity]) {
      return {
        status: false,
        message: 'Billing city is missing for the user'
      }
    }

    if (!userPreferences[this.billingZip]) {
      return {
        status: false,
        message: 'Billing zip is missing for the user'
      }
    } */

    // Validated OK
    return {
      status: true
    }
  }
}
