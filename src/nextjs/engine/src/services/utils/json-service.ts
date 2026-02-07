import { isEqual } from 'lodash'

export class JsonUtilsService {

  // Consts
  clName = 'JsonUtilsService'

  // Code
  compareObjects(a: any, b: any) {

    // Normalize via stringify/parse to remove invisible keys, etc
    // (e.g. [key] = undefined)
    const aNormalized = JSON.parse(JSON.stringify(a))
    const bNormalized = JSON.parse(JSON.stringify(b))

    // Lodash isEqual comparison of objects
    return isEqual(aNormalized, bNormalized)
  }
}
