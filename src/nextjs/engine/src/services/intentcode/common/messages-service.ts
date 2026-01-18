export class IntentCodeMessagesService {

  // Consts
  clName = 'IntentCodeMessagesService'

  // Code
  handleMessages(results: any) {

    // Warnings
    if (results.warnings != null) {

      for (const warning of results.warnings) {

        console.warn(warning)
      }
    }

    // Errors
    if (results.errors != null) {

      for (const error of results.errors) {

        console.error(error)
      }

      // Quit program if any errors were printed
      if (results.errors.length > 0) {
        process.exit(1)
      }
    }
  }
}
