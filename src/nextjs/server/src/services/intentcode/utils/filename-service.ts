export class IntentCodeFilenameService {

  // Consts
  clName = 'IntentCodeFilenameService'

  // Code
  getTargetLang(filename: string): string | undefined {

    const parts = filename.split('.')
    return parts.length >= 3 ? parts[parts.length - 2] : undefined
  }
}
