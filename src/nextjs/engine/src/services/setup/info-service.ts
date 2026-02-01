import { sqlLiteFile } from '../../db'

export class InfoService {

  // Consts
  clName = 'InfoService'

  // Code
  async info() {

    console.log(``)
    console.log(`# Info`)
    console.log(``)

    if (sqlLiteFile != null) {

      console.log(`SQLite file: ${sqlLiteFile}`)
    } else {
      console.log(`Non-SQLite DB`)
    }
  }
}
