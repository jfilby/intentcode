export class IntentCodeFilenameService {

  // Consts
  clName = 'IntentCodeFilenameService'

  // Code
  getTargetFileExt(filename: string): string | undefined {

    // Get filename parts split by dot
    const parts = filename.split('.')

    // If enough parts return the file ext with a dot prefix
    return parts.length >= 3 ? '.' + parts[parts.length - 2] : undefined
  }
}
