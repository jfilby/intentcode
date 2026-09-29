import path from 'path'

export class IntentCodeFilenameService {

  // Consts
  clName = 'IntentCodeFilenameService'

  // Code
  getTargetFileExt(filename: string): string | undefined {

    // IntentCode files are named <target>.<ext>.md, so the target extension is
    // the second-to-last dot-separated segment of the BASENAME. This used to
    // split the whole path, so any dot in a parent directory leaked into the
    // result: '/home/u/my.app/intent/index.ts.md' produced '.app/intent/index'
    // and the compiler was instructed to emit that as the target language.
    const parts = path.basename(filename).split('.')

    // Need <name>.<ext>.md to be present
    if (parts.length < 3) {
      return undefined
    }

    const fileExt = parts[parts.length - 2]

    if (fileExt.length === 0) {
      return undefined
    }

    return '.' + fileExt
  }
}
