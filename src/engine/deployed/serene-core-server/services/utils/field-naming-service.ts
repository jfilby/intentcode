export class FieldNamingService {

  // Consts
  clName = 'FieldNamingService'

  // Code
  getAsKey(name: string) {

    // Trim leading/trailing spaces
    let key = name.trim()

    // Replace spaces with hyphens
    key = key.replace(/\s+/g, '-')

    // Remove any character that is not A-Z, a-z, 0-9, hyphen, or underscore
    key = key.replace(/[^A-Za-z0-9-_]/g, '')

    return key
  }

  validateKey(
    key: string,
    label: string) {

    // Key must be at least 4 chars long (helps reserve short names in the URL)
    if (key.length < 4) {
      return {
        status: false,
        message: `The ${label} is too short (4+ characters)`
      }
    }

    // Return
    return {
      status: true
    }
  }

  validateName(
    name: string,
    label: string) {

    // Null/undefined check
    if (name == null) {
      return {
        status: false,
        message: `The ${label} is null`
      }
    }

    // Trim the workflow name
    name = name.trim()

    // Name must not start or end with a hypen
    if (name[0] === '-' ||
        name[name.length - 1] === '-') {
      return {
        status: false,
        message: `The ${label} can't start or end with a hypen`
      }
    }

    // Name must not start or end with an underscore
    if (name[0] === '_' ||
        name[name.length - 1] === '_') {
      return {
        status: false,
        message: `The ${label} can't start or end with an underscore`
      }
    }

    // Return
    return {
      status: true,
      name: name
    }
  }
}
