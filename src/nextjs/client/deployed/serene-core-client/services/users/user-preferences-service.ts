import { getUserPreferencesQuery } from '../../apollo/user-preferences'

export class UserPreferencesService {

  zipCountries = [ 'Philippines',
                   'United States' ]

  async getByKeys(
          apolloClient: any,
          userProfileId: string,
          category: string,
          keys: string[]) {

    // GraphQL call to get or create user
    var results: any = null

    console.log('UserPreferencesService.getByKeys(): ' +
                `userProfileId: ${userProfileId} category: ${category} ` +
                `keys: ${keys}`)

    await apolloClient.query({
      query: getUserPreferencesQuery,
      variables: {
        userProfileId: userProfileId,
        category: category,
        keys: keys
      }
    }).then((result: any) => results = result)
      .catch((error: any) => {
        console.log(`error.networkError: ${JSON.stringify(error.networkError)}`)
      })

    console.log(`results: ${JSON.stringify(results)}`)

    return results.data['getUserPreferences']
  }

  getZipOrPostalCodeLabel(
    country: string,
    billingCountryAsMyCountry: boolean,
    billingCountry: string) {

    if (this.hasZipInsteadOfPostalCode(
          country,
          billingCountryAsMyCountry,
          billingCountry)) {
      return 'Zip'
    } else {
      return 'Postal code'
    }
  }

  hasZipInsteadOfPostalCode(
    country: string,
    billingCountryAsMyCountry: boolean,
    billingCountry: string) {

    if (billingCountryAsMyCountry === true) {
      return this.zipCountries.includes(country)
    } else {
      return this.zipCountries.includes(billingCountry)
    }
  }
}
