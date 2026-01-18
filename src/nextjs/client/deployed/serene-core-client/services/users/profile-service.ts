import { countries } from '../locale/countries'

export class ProfileService {

  firstName = 'first name'
  fullName = 'full name'
  countryCode = 'country code'
  billingNameAsMyName = 'billing name as my name'
  billingCountryAsMyCountry = 'billing country as my country'
  billingCountryCode = 'billing country code'
  billingFirstName = 'billing first name'
  billingLastName = 'billing last name'
  billingAddressLine1 = 'billing address line 1'
  billingAddressLine2 = 'billing address line 2'
  billingCity = 'billing city'
  billingState = 'billing state'
  billingZip = 'billing zip'

  getCountryByCode(countryCode: string): string {
    for (const countryIter of countries) {
      if (countryIter.code === countryCode) {
        return countryIter.name
      }
    }

    return ''
  }
}
